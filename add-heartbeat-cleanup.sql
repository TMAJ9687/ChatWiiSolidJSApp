-- Add heartbeat-based cleanup for better disconnect detection
-- This catches users who didn't get cleaned up by browser events

-- Create function to cleanup users with stale heartbeats
CREATE OR REPLACE FUNCTION cleanup_stale_presence_users()
RETURNS JSONB AS $$
DECLARE
    stale_cutoff TIMESTAMP WITH TIME ZONE;
    cleaned_count INTEGER := 0;
BEGIN
    -- Set cutoff to 2 minutes ago (more aggressive than 5 minutes)
    stale_cutoff := NOW() - INTERVAL '2 minutes';

    -- Delete users from presence table who haven't updated in 2+ minutes
    WITH deleted_users AS (
        DELETE FROM presence
        WHERE last_seen < stale_cutoff
        AND online = true
        RETURNING user_id
    )
    SELECT COUNT(*) INTO cleaned_count FROM deleted_users;

    -- Also update users table to mark them offline
    UPDATE users
    SET online = false,
        last_seen = NOW()
    WHERE id IN (
        SELECT user_id FROM presence
        WHERE last_seen < stale_cutoff
        AND online = true
    );

    -- Log the cleanup if any users were cleaned
    IF cleaned_count > 0 THEN
        INSERT INTO cleanup_logs (operation, users_affected, details, executed_at)
        VALUES (
            'HEARTBEAT_CLEANUP',
            cleaned_count,
            format('Cleaned up %s users with stale heartbeats (>2min)', cleaned_count),
            NOW()
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'cleaned_users', cleaned_count,
        'cutoff_time', stale_cutoff,
        'message', format('Cleaned up %s stale users', cleaned_count)
    );

EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO cleanup_logs (operation, users_affected, details, executed_at)
        VALUES (
            'HEARTBEAT_CLEANUP_ERROR',
            0,
            format('Heartbeat cleanup failed: %s', SQLERRM),
            NOW()
        );

        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Heartbeat cleanup failed'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION cleanup_stale_presence_users() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_stale_presence_users() TO anon;

-- Add this to the existing pg_cron schedule (runs every 2 minutes)
-- First check if pg_cron is available
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Schedule heartbeat cleanup every 2 minutes
        PERFORM cron.schedule(
            'cleanup-stale-presence',
            '*/2 * * * *', -- Every 2 minutes
            'SELECT cleanup_stale_presence_users();'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- pg_cron might not be available, that's ok
        NULL;
END;
$$;

-- Also create a manual trigger for immediate cleanup
CREATE OR REPLACE FUNCTION trigger_immediate_cleanup()
RETURNS JSONB AS $$
BEGIN
    -- Run both cleanup functions
    PERFORM cleanup_stale_presence_users();
    PERFORM safe_cleanup_anonymous_users(false);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Immediate cleanup triggered for stale users and anonymous accounts'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION trigger_immediate_cleanup() TO authenticated;

-- Add comment
COMMENT ON FUNCTION cleanup_stale_presence_users IS 'Clean up users with stale heartbeats (>2min) from presence table';
COMMENT ON FUNCTION trigger_immediate_cleanup IS 'Manually trigger immediate cleanup of stale users and anonymous accounts';