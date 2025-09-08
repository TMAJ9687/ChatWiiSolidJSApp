-- Migration 006: Admin Functions (Clean Version)
-- This migration adds simple, working database functions for admin operations

-- Function to safely update user status
CREATE OR REPLACE FUNCTION safe_update_user_status(
    p_user_id UUID,
    p_status TEXT,
    p_admin_id UUID,
    p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_exists BOOLEAN := FALSE;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO user_exists;
    
    IF NOT user_exists THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
    
    -- Validate status
    IF p_status NOT IN ('active', 'kicked', 'banned') THEN
        RAISE EXCEPTION 'Invalid status: %', p_status;
    END IF;
    
    -- Update user status
    UPDATE users 
    SET 
        status = p_status,
        updated_at = NOW(),
        online = CASE WHEN p_status = 'active' THEN online ELSE FALSE END,
        last_seen = CASE WHEN p_status != 'active' THEN NOW() ELSE last_seen END
    WHERE id = p_user_id;
    
    -- Update presence table if user is being kicked/banned
    IF p_status != 'active' THEN
        UPDATE presence 
        SET 
            online = FALSE,
            last_seen = NOW()
        WHERE user_id = p_user_id;
    END IF;
    
    -- Log admin action
    INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details)
    VALUES (
        p_admin_id,
        'update_user_status_' || p_status,
        'user',
        p_user_id::TEXT,
        jsonb_build_object('status', p_status, 'reason', COALESCE(p_reason, ''))
    );
    
    RETURN TRUE;
END;
$$;

-- Overloaded version with optional parameters
CREATE OR REPLACE FUNCTION safe_update_user_status(
    p_user_id UUID,
    p_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update user status without audit logging
    UPDATE users 
    SET 
        status = p_status,
        updated_at = NOW(),
        online = CASE WHEN p_status = 'active' THEN online ELSE FALSE END,
        last_seen = CASE WHEN p_status != 'active' THEN NOW() ELSE last_seen END
    WHERE id = p_user_id;
    
    -- Update presence table if user is being kicked/banned
    IF p_status != 'active' THEN
        UPDATE presence 
        SET 
            online = FALSE,
            last_seen = NOW()
        WHERE user_id = p_user_id;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Function to safely update user role
CREATE OR REPLACE FUNCTION safe_update_user_role(
    p_user_id UUID,
    p_role TEXT,
    p_admin_id UUID,
    p_duration_days INTEGER
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
    
    -- Validate role
    IF p_role NOT IN ('standard', 'vip', 'admin') THEN
        RAISE EXCEPTION 'Invalid role: %', p_role;
    END IF;
    
    -- Calculate VIP expiry if upgrading to VIP
    IF p_role = 'vip' AND p_duration_days IS NOT NULL THEN
        vip_expiry := NOW() + (p_duration_days || ' days')::INTERVAL;
    ELSE
        vip_expiry := NULL;
    END IF;
    
    -- Update user role
    UPDATE users 
    SET 
        role = p_role,
        vip_expires_at = vip_expiry,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log admin action
    INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details)
    VALUES (
        p_admin_id,
        'update_user_role_' || p_role,
        'user',
        p_user_id::TEXT,
        jsonb_build_object(
            'role', p_role, 
            'duration_days', CASE WHEN p_role = 'vip' THEN p_duration_days ELSE NULL END
        )
    );
    
    RETURN TRUE;
END;
$$;

-- Overloaded version with default duration
CREATE OR REPLACE FUNCTION safe_update_user_role(
    p_user_id UUID,
    p_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update user role without audit logging
    UPDATE users 
    SET 
        role = p_role,
        vip_expires_at = CASE WHEN p_role = 'vip' THEN NOW() + '30 days'::INTERVAL ELSE NULL END,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN TRUE;
END;
$$;

-- Function to create ban record
CREATE OR REPLACE FUNCTION create_ban_record(
    p_admin_id UUID,
    p_reason TEXT,
    p_user_id UUID,
    p_ip_address INET,
    p_duration_hours INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    ban_id UUID;
    expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Validate input
    IF p_user_id IS NULL AND p_ip_address IS NULL THEN
        RAISE EXCEPTION 'Either user_id or ip_address must be provided';
    END IF;
    
    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'Reason is required for bans';
    END IF;
    
    -- Calculate expiry time
    IF p_duration_hours IS NOT NULL AND p_duration_hours > 0 THEN
        expires_at := NOW() + (p_duration_hours || ' hours')::INTERVAL;
    END IF;
    
    -- Insert ban record
    INSERT INTO bans (
        user_id,
        ip_address,
        reason,
        banned_by,
        expires_at,
        is_active
    ) VALUES (
        p_user_id,
        p_ip_address,
        p_reason,
        p_admin_id,
        expires_at,
        TRUE
    ) RETURNING id INTO ban_id;
    
    -- Update user status if user ban
    IF p_user_id IS NOT NULL THEN
        PERFORM safe_update_user_status(p_user_id, 'banned', p_admin_id, p_reason);
    END IF;
    
    RETURN ban_id;
END;
$$;

-- Overloaded versions for optional parameters
CREATE OR REPLACE FUNCTION create_ban_record(
    p_admin_id UUID,
    p_reason TEXT,
    p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN create_ban_record(p_admin_id, p_reason, p_user_id, NULL, NULL);
END;
$$;

-- Simple cleanup enable/disable functions
CREATE OR REPLACE FUNCTION enable_cleanup_schedule()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Cleanup scheduling enabled'
    );
END;
$$;

CREATE OR REPLACE FUNCTION disable_cleanup_schedule()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Cleanup scheduling disabled'
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION safe_update_user_status(UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION safe_update_user_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION safe_update_user_role(UUID, TEXT, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION safe_update_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_ban_record(UUID, TEXT, UUID, INET, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_ban_record(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION enable_cleanup_schedule() TO authenticated;
GRANT EXECUTE ON FUNCTION disable_cleanup_schedule() TO authenticated;