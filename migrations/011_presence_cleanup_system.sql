-- Migration 011: Comprehensive Presence Cleanup System
-- This migration adds automatic cleanup for stale user presence records
-- Addresses the issue where users don't disappear from user lists when they close tabs or crash

BEGIN;

-- Add heartbeat tracking to presence table
ALTER TABLE public.presence 
ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS ip_address INET;

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_presence_heartbeat_cleanup 
ON public.presence(online, heartbeat_at) 
WHERE online = true;

-- Create index for session tracking
CREATE INDEX IF NOT EXISTS idx_presence_session_id 
ON public.presence(session_id) 
WHERE session_id IS NOT NULL;

-- Function to update user heartbeat
CREATE OR REPLACE FUNCTION update_user_heartbeat(
    p_user_id UUID,
    p_session_id TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update or insert presence record with heartbeat
    INSERT INTO public.presence (
        user_id, online, last_seen, heartbeat_at, session_id, user_agent, ip_address,
        nickname, gender, age, country, role, avatar
    )
    SELECT 
        u.id, true, NOW(), NOW(), p_session_id, p_user_agent, p_ip_address,
        u.nickname, u.gender, u.age, u.country, u.role, COALESCE(u.avatar, '')
    FROM public.users u
    WHERE u.id = p_user_id
    ON CONFLICT (user_id) DO UPDATE SET
        online = true,
        last_seen = NOW(),
        heartbeat_at = NOW(),
        session_id = COALESCE(EXCLUDED.session_id, presence.session_id),
        user_agent = COALESCE(EXCLUDED.user_agent, presence.user_agent),
        ip_address = COALESCE(EXCLUDED.ip_address, presence.ip_address),
        -- Update user info in case it changed
        nickname = EXCLUDED.nickname,
        gender = EXCLUDED.gender,
        age = EXCLUDED.age,
        country = EXCLUDED.country,
        role = EXCLUDED.role,
        avatar = EXCLUDED.avatar;
END;
$$;

-- Function to mark user as offline
CREATE OR REPLACE FUNCTION mark_user_offline(
    p_user_id UUID,
    p_session_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If session_id is provided, only mark offline if it matches
    -- This prevents race conditions with multiple sessions
    IF p_session_id IS NOT NULL THEN
        UPDATE public.presence 
        SET 
            online = false,
            last_seen = NOW()
        WHERE user_id = p_user_id 
        AND (session_id = p_session_id OR session_id IS NULL);
    ELSE
        -- Mark offline regardless of session
        UPDATE public.presence 
        SET 
            online = false,
            last_seen = NOW()
        WHERE user_id = p_user_id;
    END IF;
    
    -- Also update users table
    UPDATE public.users 
    SET 
        online = false,
        last_seen = NOW()
    WHERE id = p_user_id;
END;
$$;

-- Function to cleanup stale presence records
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stale_count INTEGER;
    stale_threshold INTERVAL := INTERVAL '2 minutes'; -- Users are considered stale after 2 minutes without heartbeat
BEGIN
    -- Mark users as offline if they haven't sent a heartbeat recently
    UPDATE public.presence 
    SET 
        online = false,
        last_seen = heartbeat_at
    WHERE 
        online = true 
        AND heartbeat_at < (NOW() - stale_threshold);
    
    GET DIAGNOSTICS stale_count = ROW_COUNT;
    
    -- Also update the users table to keep it in sync
    UPDATE public.users 
    SET 
        online = false,
        last_seen = NOW()
    WHERE 
        id IN (
            SELECT user_id 
            FROM public.presence 
            WHERE online = false 
            AND last_seen > (NOW() - INTERVAL '5 minutes')
        )
        AND online = true;
    
    -- Log the cleanup operation
    IF stale_count > 0 THEN
        INSERT INTO public.admin_logs (
            admin_id, admin_nickname, action, target_type, 
            target_id, details, created_at
        ) VALUES (
            NULL, 'system', 'cleanup_stale_presence', 'system',
            NULL, 
            jsonb_build_object(
                'users_cleaned', stale_count,
                'threshold_minutes', EXTRACT(EPOCH FROM stale_threshold) / 60
            ),
            NOW()
        );
    END IF;
    
    RETURN stale_count;
END;
$$;

-- Function to get active users with proper cleanup
CREATE OR REPLACE FUNCTION get_active_users()
RETURNS TABLE (
    user_id UUID,
    nickname TEXT,
    gender TEXT,
    age INTEGER,
    country TEXT,
    role TEXT,
    avatar TEXT,
    online BOOLEAN,
    last_seen TIMESTAMPTZ,
    joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- First cleanup stale presence
    PERFORM cleanup_stale_presence();
    
    -- Return active users
    RETURN QUERY
    SELECT 
        p.user_id,
        p.nickname,
        p.gender,
        p.age,
        p.country,
        p.role,
        p.avatar,
        p.online,
        p.last_seen,
        p.joined_at
    FROM public.presence p
    INNER JOIN public.users u ON p.user_id = u.id
    WHERE 
        u.status = 'active' -- Only active users (not banned/kicked)
        AND p.online = true
    ORDER BY p.joined_at DESC;
END;
$$;

-- Function to handle user disconnect (for when browser closes)
CREATE OR REPLACE FUNCTION handle_user_disconnect(
    p_user_id UUID,
    p_session_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Mark user as offline
    PERFORM mark_user_offline(p_user_id, p_session_id);
    
    -- Clean up typing indicators
    DELETE FROM public.typing 
    WHERE user_id = p_user_id;
    
    -- Log the disconnect
    INSERT INTO public.admin_logs (
        admin_id, admin_nickname, action, target_type, 
        target_id, details, created_at
    ) VALUES (
        p_user_id, 
        (SELECT nickname FROM public.users WHERE id = p_user_id),
        'user_disconnect', 'user',
        p_user_id, 
        jsonb_build_object(
            'session_id', p_session_id,
            'disconnect_time', NOW()
        ),
        NOW()
    );
END;
$$;

-- Create a function to be called periodically for cleanup
CREATE OR REPLACE FUNCTION scheduled_presence_cleanup()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cleanup_count INTEGER;
BEGIN
    -- Cleanup stale presence
    SELECT cleanup_stale_presence() INTO cleanup_count;
    
    -- Clean up old typing indicators (older than 1 minute)
    DELETE FROM public.typing 
    WHERE expires_at < NOW() OR created_at < (NOW() - INTERVAL '1 minute');
    
    -- Clean up old admin logs (keep only last 30 days)
    DELETE FROM public.admin_logs 
    WHERE created_at < (NOW() - INTERVAL '30 days')
    AND action IN ('cleanup_stale_presence', 'user_disconnect', 'user_heartbeat');
    
    -- Update statistics
    INSERT INTO public.admin_logs (
        admin_id, admin_nickname, action, target_type, 
        target_id, details, created_at
    ) VALUES (
        NULL, 'system', 'scheduled_cleanup', 'system',
        NULL, 
        jsonb_build_object(
            'presence_cleaned', cleanup_count,
            'cleanup_time', NOW()
        ),
        NOW()
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_user_heartbeat(UUID, TEXT, TEXT, INET) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_user_offline(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_stale_presence() TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_users() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_user_disconnect(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION scheduled_presence_cleanup() TO authenticated;

-- Add comments
COMMENT ON FUNCTION update_user_heartbeat IS 'Updates user heartbeat to keep them marked as online';
COMMENT ON FUNCTION mark_user_offline IS 'Marks a user as offline, optionally checking session ID';
COMMENT ON FUNCTION cleanup_stale_presence IS 'Cleans up stale presence records for users who disconnected without notice';
COMMENT ON FUNCTION get_active_users IS 'Gets list of active users with automatic cleanup';
COMMENT ON FUNCTION handle_user_disconnect IS 'Handles proper user disconnect cleanup';
COMMENT ON FUNCTION scheduled_presence_cleanup IS 'Scheduled cleanup function to be called periodically';

COMMIT;