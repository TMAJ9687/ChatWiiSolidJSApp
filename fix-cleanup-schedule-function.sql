-- Fix cleanup schedule functions to use correct table names
-- This fixes the "audit_logs does not exist" error

-- Function to enable cleanup schedule (FIXED VERSION)
CREATE OR REPLACE FUNCTION enable_cleanup_schedule()
RETURNS JSONB AS $$
DECLARE
    job_exists BOOLEAN := false;
    cron_available BOOLEAN := false;
BEGIN
    -- Check if pg_cron extension is available
    SELECT EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) INTO cron_available;

    IF NOT cron_available THEN
        -- Try to enable pg_cron extension if not available
        BEGIN
            CREATE EXTENSION IF NOT EXISTS pg_cron;
            cron_available := true;
        EXCEPTION
            WHEN OTHERS THEN
                -- pg_cron not available, log to cleanup_logs instead
                INSERT INTO cleanup_logs (operation, users_affected, details, executed_at)
                VALUES (
                    'ENABLE_CLEANUP_SCHEDULE_FAILED',
                    0,
                    'pg_cron extension not available',
                    NOW()
                );

                RETURN jsonb_build_object(
                    'success', false,
                    'message', 'pg_cron extension not available. Manual cleanup only.'
                );
        END;
    END IF;

    -- Check if cleanup job already exists
    SELECT EXISTS(
        SELECT 1 FROM cron.job WHERE jobname = 'cleanup-anonymous-users'
    ) INTO job_exists;

    IF job_exists THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Automatic cleanup is already enabled'
        );
    END IF;

    -- Schedule the cleanup job to run every hour
    PERFORM cron.schedule(
        'cleanup-anonymous-users',
        '0 * * * *', -- Every hour at minute 0
        'SELECT cleanup_anonymous_users_with_logging();'
    );

    -- Log the successful scheduling to cleanup_logs
    INSERT INTO cleanup_logs (operation, users_affected, details, executed_at)
    VALUES (
        'ENABLE_CLEANUP_SCHEDULE',
        0,
        'pg_cron scheduled job active - hourly cleanup enabled',
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Automatic cleanup schedule enabled successfully'
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Log error to cleanup_logs
        INSERT INTO cleanup_logs (operation, users_affected, details, executed_at)
        VALUES (
            'ENABLE_CLEANUP_SCHEDULE_ERROR',
            0,
            format('Failed to enable cleanup schedule: %s', SQLERRM),
            NOW()
        );

        RETURN jsonb_build_object(
            'success', false,
            'message', format('Failed to enable cleanup schedule: %s', SQLERRM)
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to disable cleanup schedule (FIXED VERSION)
CREATE OR REPLACE FUNCTION disable_cleanup_schedule()
RETURNS JSONB AS $$
DECLARE
    job_exists BOOLEAN := false;
    cron_available BOOLEAN := false;
BEGIN
    -- Check if pg_cron extension is available
    SELECT EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) INTO cron_available;

    IF NOT cron_available THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'pg_cron extension not available'
        );
    END IF;

    -- Check if cleanup job exists
    SELECT EXISTS(
        SELECT 1 FROM cron.job WHERE jobname = 'cleanup-anonymous-users'
    ) INTO job_exists;

    IF NOT job_exists THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Automatic cleanup is already disabled'
        );
    END IF;

    -- Unschedule the cleanup job
    PERFORM cron.unschedule('cleanup-anonymous-users');

    -- Log the successful unscheduling to cleanup_logs
    INSERT INTO cleanup_logs (operation, users_affected, details, executed_at)
    VALUES (
        'DISABLE_CLEANUP_SCHEDULE',
        0,
        'pg_cron scheduled job removed - automatic cleanup disabled',
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Automatic cleanup schedule disabled successfully'
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Log error to cleanup_logs
        INSERT INTO cleanup_logs (operation, users_affected, details, executed_at)
        VALUES (
            'DISABLE_CLEANUP_SCHEDULE_ERROR',
            0,
            format('Failed to disable cleanup schedule: %s', SQLERRM),
            NOW()
        );

        RETURN jsonb_build_object(
            'success', false,
            'message', format('Failed to disable cleanup schedule: %s', SQLERRM)
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION enable_cleanup_schedule() TO authenticated;
GRANT EXECUTE ON FUNCTION disable_cleanup_schedule() TO authenticated;

-- Test that cleanup_logs table exists and create if needed
DO $$
BEGIN
    -- Check if cleanup_logs table exists, create if not
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cleanup_logs') THEN
        CREATE TABLE cleanup_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            operation TEXT NOT NULL,
            users_affected INTEGER DEFAULT 0,
            details TEXT,
            executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Grant permissions
        GRANT ALL ON cleanup_logs TO authenticated;
    END IF;
END
$$;