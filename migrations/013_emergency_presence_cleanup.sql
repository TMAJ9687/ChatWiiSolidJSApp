-- Migration 013: Emergency Presence Cleanup
-- This migration provides immediate cleanup functions and fixes for the presence system

BEGIN;

-- Function to immediately clear all stale users (EMERGENCY USE)
CREATE OR REPLACE FUNCTION emergency_clear_all_presence()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cleared_count INTEGER;
    total_before INTEGER;
BEGIN
    -- Get count before cleanup
    SELECT COUNT(*) INTO total_before FROM public.presence WHERE online = true;
    
    -- Mark ALL users as offline
    UPDATE public.presence SET 
        online = false,
        last_seen = NOW()
    WHERE online = true;
    
    GET DIAGNOSTICS cleared_count = ROW_COUNT;
    
    -- Also update users table
    UPDATE public.users SET 
        online = false,
        last_seen = NOW()
    WHERE online = true;
    
    -- Log the emergency cleanup
    INSERT INTO public.admin_logs (
        admin_id, admin_nickname, action, target_type, 
        target_id, details, created_at
    ) VALUES (
        NULL, 'system', 'emergency_clear_all_presence', 'system',
        NULL, 
        jsonb_build_object(
            'users_cleared', cleared_count,
            'total_before', total_before,
            'cleanup_time', NOW(),
            'reason', 'Emergency cleanup - all users marked offline'
        ),
        NOW()
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Emergency cleanup completed',
        'users_cleared', cleared_count,
        'total_before', total_before
    );
END;
$$;

-- Function to clear anonymous/guest users specifically
CREATE OR REPLACE FUNCTION clear_anonymous_users()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cleared_count INTEGER;
    anonymous_users UUID[];
BEGIN
    -- Find anonymous users (users without proper auth or with generic names)
    SELECT ARRAY_AGG(p.user_id) INTO anonymous_users
    FROM public.presence p
    INNER JOIN public.users u ON p.user_id = u.id
    LEFT JOIN auth.users au ON u.id = au.id
    WHERE p.online = true
    AND (
        au.id IS NULL OR  -- No auth record
        u.nickname ILIKE 'user%' OR  -- Generic usernames
        u.nickname ILIKE 'guest%' OR
        u.nickname ILIKE 'anonymous%' OR
        u.created_at < (NOW() - INTERVAL '7 days') -- Old accounts
    );
    
    -- Clear these users from presence
    UPDATE public.presence 
    SET online = false, last_seen = NOW()
    WHERE user_id = ANY(anonymous_users);
    
    GET DIAGNOSTICS cleared_count = ROW_COUNT;
    
    -- Also update users table
    UPDATE public.users 
    SET online = false, last_seen = NOW()
    WHERE id = ANY(anonymous_users);
    
    -- Log the cleanup
    INSERT INTO public.admin_logs (
        admin_id, admin_nickname, action, target_type, 
        target_id, details, created_at
    ) VALUES (
        NULL, 'system', 'clear_anonymous_users', 'system',
        NULL, 
        jsonb_build_object(
            'users_cleared', cleared_count,
            'user_ids', anonymous_users,
            'cleanup_time', NOW()
        ),
        NOW()
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Anonymous users cleared',
        'users_cleared', cleared_count,
        'user_ids', anonymous_users
    );
END;
$$;

-- Function to get presence statistics for debugging
CREATE OR REPLACE FUNCTION get_presence_debug_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_presence_records', (SELECT COUNT(*) FROM public.presence),
        'online_users', (SELECT COUNT(*) FROM public.presence WHERE online = true),
        'offline_users', (SELECT COUNT(*) FROM public.presence WHERE online = false),
        'stale_users_2min', (
            SELECT COUNT(*) FROM public.presence 
            WHERE online = true 
            AND heartbeat_at < (NOW() - INTERVAL '2 minutes')
        ),
        'stale_users_5min', (
            SELECT COUNT(*) FROM public.presence 
            WHERE online = true 
            AND heartbeat_at < (NOW() - INTERVAL '5 minutes')
        ),
        'stale_users_1hour', (
            SELECT COUNT(*) FROM public.presence 
            WHERE online = true 
            AND heartbeat_at < (NOW() - INTERVAL '1 hour')
        ),
        'users_without_heartbeat', (
            SELECT COUNT(*) FROM public.presence 
            WHERE online = true 
            AND heartbeat_at IS NULL
        ),
        'users_without_session', (
            SELECT COUNT(*) FROM public.presence 
            WHERE online = true 
            AND session_id IS NULL
        ),
        'total_auth_users', (SELECT COUNT(*) FROM auth.users),
        'total_user_profiles', (SELECT COUNT(*) FROM public.users),
        'users_online_in_users_table', (SELECT COUNT(*) FROM public.users WHERE online = true),
        'last_cleanup', (
            SELECT created_at FROM public.admin_logs 
            WHERE action = 'cleanup_stale_presence' 
            ORDER BY created_at DESC LIMIT 1
        )
    ) INTO stats;
    
    RETURN stats;
END;
$$;

-- Function to force cleanup with detailed reporting
CREATE OR REPLACE FUNCTION force_presence_cleanup_detailed()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    before_stats JSONB;
    after_stats JSONB;
    cleaned_count INTEGER;
BEGIN
    -- Get stats before cleanup
    SELECT get_presence_debug_stats() INTO before_stats;
    
    -- Run cleanup
    SELECT cleanup_stale_presence() INTO cleaned_count;
    
    -- Get stats after cleanup
    SELECT get_presence_debug_stats() INTO after_stats;
    
    RETURN jsonb_build_object(
        'success', true,
        'cleaned_count', cleaned_count,
        'before_stats', before_stats,
        'after_stats', after_stats,
        'cleanup_time', NOW()
    );
END;
$$;

-- Function to reset presence system completely
CREATE OR REPLACE FUNCTION reset_presence_system()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Clear all presence records
    DELETE FROM public.presence;
    
    -- Reset all users to offline
    UPDATE public.users SET online = false, last_seen = NOW();
    
    -- Clear typing indicators
    DELETE FROM public.typing;
    
    -- Log the reset
    INSERT INTO public.admin_logs (
        admin_id, admin_nickname, action, target_type, 
        target_id, details, created_at
    ) VALUES (
        NULL, 'system', 'reset_presence_system', 'system',
        NULL, 
        jsonb_build_object(
            'action', 'complete_reset',
            'reset_time', NOW()
        ),
        NOW()
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Presence system completely reset',
        'reset_time', NOW()
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION emergency_clear_all_presence() TO authenticated;
GRANT EXECUTE ON FUNCTION clear_anonymous_users() TO authenticated;
GRANT EXECUTE ON FUNCTION get_presence_debug_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION force_presence_cleanup_detailed() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_presence_system() TO authenticated;

-- Add comments
COMMENT ON FUNCTION emergency_clear_all_presence IS 'EMERGENCY: Clear all online users immediately';
COMMENT ON FUNCTION clear_anonymous_users IS 'Clear anonymous/guest users from presence';
COMMENT ON FUNCTION get_presence_debug_stats IS 'Get detailed presence system statistics for debugging';
COMMENT ON FUNCTION force_presence_cleanup_detailed IS 'Force cleanup with detailed before/after stats';
COMMENT ON FUNCTION reset_presence_system IS 'NUCLEAR OPTION: Reset entire presence system';

COMMIT;