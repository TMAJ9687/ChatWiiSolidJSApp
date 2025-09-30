-- Emergency User Offline Function for navigator.sendBeacon
-- This function handles immediate user cleanup when browser unloads
-- It's designed to be called by navigator.sendBeacon for reliability

-- Drop any existing emergency_user_offline functions
DROP FUNCTION IF EXISTS emergency_user_offline CASCADE;

CREATE OR REPLACE FUNCTION emergency_user_offline(user_id UUID, cleanup_timestamp TIMESTAMP WITH TIME ZONE)
RETURNS JSONB AS $$
DECLARE
    user_role TEXT;
    cleanup_result TEXT := 'offline_only';
BEGIN
    -- Check if user exists and get their role
    SELECT role INTO user_role
    FROM users
    WHERE id = user_id;

    IF user_role IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User not found',
            'user_id', user_id
        );
    END IF;

    -- Remove from presence table immediately (most critical for user list)
    DELETE FROM presence WHERE user_id = emergency_user_offline.user_id;

    -- Update user's last seen and online status
    UPDATE users
    SET online = false,
        last_seen = cleanup_timestamp
    WHERE id = emergency_user_offline.user_id;

    -- For standard users, perform complete cleanup
    IF user_role = 'standard' THEN
        -- Delete user data in correct order (foreign key constraints)
        DELETE FROM typing WHERE typing.user_id = emergency_user_offline.user_id;
        DELETE FROM reactions WHERE reactions.user_id = emergency_user_offline.user_id;
        DELETE FROM blocks WHERE blocker_id = emergency_user_offline.user_id OR blocked_id = emergency_user_offline.user_id;
        DELETE FROM reports WHERE reporter_id = emergency_user_offline.user_id OR reported_id = emergency_user_offline.user_id;
        DELETE FROM messages WHERE sender_id = emergency_user_offline.user_id OR receiver_id = emergency_user_offline.user_id;

        -- Delete user profile
        DELETE FROM users WHERE id = emergency_user_offline.user_id;

        cleanup_result := 'complete_cleanup';

        -- Log the emergency cleanup
        INSERT INTO cleanup_logs (operation, users_affected, details, executed_at)
        VALUES (
            'EMERGENCY_CLEANUP',
            1,
            format('Emergency cleanup for user %s via sendBeacon', emergency_user_offline.user_id::text),
            cleanup_timestamp
        );
    ELSE
        -- For VIP/Admin users, just set offline
        cleanup_result := 'vip_offline_only';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Emergency cleanup completed: %s', cleanup_result),
        'user_id', user_id,
        'user_role', user_role,
        'cleanup_type', cleanup_result,
        'timestamp', cleanup_timestamp
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail completely
        INSERT INTO cleanup_logs (operation, users_affected, details, executed_at)
        VALUES (
            'EMERGENCY_CLEANUP_ERROR',
            0,
            format('Emergency cleanup failed for user %s: %s', emergency_user_offline.user_id::text, SQLERRM),
            cleanup_timestamp
        );

        RETURN jsonb_build_object(
            'success', false,
            'message', format('Emergency cleanup failed: %s', SQLERRM),
            'user_id', user_id,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anonymous and authenticated users
-- This is safe because the function validates user existence
GRANT EXECUTE ON FUNCTION emergency_user_offline(UUID, TIMESTAMP WITH TIME ZONE) TO anon;
GRANT EXECUTE ON FUNCTION emergency_user_offline(UUID, TIMESTAMP WITH TIME ZONE) TO authenticated;

-- Add function overload without timestamp parameter for convenience
CREATE OR REPLACE FUNCTION emergency_user_offline(user_id UUID)
RETURNS JSONB AS $$
BEGIN
    RETURN emergency_user_offline(user_id, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION emergency_user_offline(UUID) TO anon;
GRANT EXECUTE ON FUNCTION emergency_user_offline(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION emergency_user_offline IS 'Emergency cleanup function for navigator.sendBeacon when users close browser/tab';

-- Test the function (commented out - remove comments to test)
-- SELECT emergency_user_offline('00000000-0000-0000-0000-000000000000'::UUID);