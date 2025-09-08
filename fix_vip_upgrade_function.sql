-- Fix for VIP upgrade UUID casting error
-- Run this in your Supabase SQL editor

-- Drop and recreate the safe_update_user_role function with correct UUID handling
CREATE OR REPLACE FUNCTION safe_update_user_role(
    p_user_id UUID,
    p_role TEXT,
    p_admin_id UUID DEFAULT NULL,
    p_duration_days INTEGER DEFAULT 30
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_exists BOOLEAN := FALSE;
    vip_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO user_exists;
    
    IF NOT user_exists THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
    
    -- Calculate VIP expiry if role is VIP
    IF p_role = 'vip' THEN
        vip_expiry := NOW() + (p_duration_days || ' days')::INTERVAL;
    ELSE
        vip_expiry := NULL;
    END IF;
    
    -- Update user role and VIP status
    UPDATE users 
    SET 
        role = p_role,
        vip_expires_at = vip_expiry,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log admin action if admin_id provided (FIX: Use UUID directly, not cast to TEXT)
    IF p_admin_id IS NOT NULL THEN
        INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details)
        VALUES (
            p_admin_id,
            'update_user_role_' || p_role,
            'user',
            p_user_id,  -- FIX: Don't cast to TEXT, keep as UUID
            jsonb_build_object(
                'old_role', (SELECT role FROM users WHERE id = p_user_id),
                'new_role', p_role,
                'vip_expires_at', vip_expiry,
                'duration_days', p_duration_days
            )
        );
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Also fix the safe_update_user_status function if it has the same issue
CREATE OR REPLACE FUNCTION safe_update_user_status(
    p_user_id UUID,
    p_status TEXT,
    p_admin_id UUID DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_exists BOOLEAN := FALSE;
    old_status TEXT;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO user_exists;
    
    IF NOT user_exists THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
    
    -- Get old status for logging
    SELECT status INTO old_status FROM users WHERE id = p_user_id;
    
    -- Update user status
    UPDATE users 
    SET 
        status = p_status,
        updated_at = NOW(),
        last_seen = CASE WHEN p_status = 'offline' THEN NOW() ELSE last_seen END
    WHERE id = p_user_id;
    
    -- Update kick status table if needed
    IF p_status = 'kicked' THEN
        INSERT INTO user_kick_status (user_id, is_kicked, kicked_at, reason, expires_at)
        VALUES (
            p_user_id, 
            true, 
            NOW(), 
            p_reason, 
            NOW() + '1 hour'::INTERVAL
        )
        ON CONFLICT (user_id) DO UPDATE SET
            is_kicked = true,
            kicked_at = NOW(),
            reason = p_reason,
            expires_at = NOW() + '1 hour'::INTERVAL,
            updated_at = NOW();
    ELSIF p_status = 'active' THEN
        UPDATE user_kick_status 
        SET 
            is_kicked = false,
            updated_at = NOW(),
            last_seen = NOW()
        WHERE user_id = p_user_id;
    END IF;
    
    -- Log admin action (FIX: Use UUID directly, not cast to TEXT)
    IF p_admin_id IS NOT NULL THEN
        INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details)
        VALUES (
            p_admin_id,
            'update_user_status_' || p_status,
            'user',
            p_user_id,  -- FIX: Don't cast to TEXT, keep as UUID
            jsonb_build_object(
                'old_status', old_status,
                'new_status', p_status,
                'reason', p_reason
            )
        );
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION safe_update_user_role(UUID, TEXT, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION safe_update_user_status(UUID, TEXT, UUID, TEXT) TO authenticated;

-- Test the fix (optional - remove if you don't want to test)
-- SELECT safe_update_user_role('00000000-0000-0000-0000-000000000000'::UUID, 'standard');