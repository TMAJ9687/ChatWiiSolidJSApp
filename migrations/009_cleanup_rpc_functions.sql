-- Migration 009: Add cleanup RPC functions
-- This migration adds the missing RPC functions for cleanup management

-- Function to enable cleanup schedule
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
                -- pg_cron not available, use fallback logging
                INSERT INTO audit_logs (admin_id, action, target_type, target_id, details, created_at)
                VALUES (
                    'system',
                    'enable_cleanup_schedule',
                    'system',
                    'cleanup-scheduler',
                    jsonb_build_object(
                        'status', 'fallback',
                        'schedule', 'manual only',
                        'note', 'pg_cron extension not available'
                    ),
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

    -- Log the successful scheduling
    INSERT INTO audit_logs (admin_id, action, target_type, target_id, details, created_at)
    VALUES (
        'system',
        'enable_cleanup_schedule',
        'system',
        'cleanup-scheduler',
        jsonb_build_object(
            'status', 'enabled',
            'schedule', 'hourly (0 * * * *)',
            'note', 'pg_cron scheduled job active'
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Automatic cleanup schedule enabled successfully'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Failed to enable cleanup schedule: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to disable cleanup schedule
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

    -- Log the successful unscheduling
    INSERT INTO audit_logs (admin_id, action, target_type, target_id, details, created_at)
    VALUES (
        'system',
        'disable_cleanup_schedule',
        'system',
        'cleanup-scheduler',
        jsonb_build_object(
            'status', 'disabled',
            'note', 'pg_cron scheduled job removed'
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Automatic cleanup schedule disabled successfully'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Failed to disable cleanup schedule: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log cleanup operations
CREATE OR REPLACE FUNCTION log_cleanup_operation(
    op TEXT,
    users_count INTEGER,
    details_text TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO cleanup_logs (operation, users_affected, details, executed_at)
    VALUES (op, users_count, details_text, NOW());
EXCEPTION
    WHEN OTHERS THEN
        -- If cleanup_logs table doesn't exist, create it
        BEGIN
            CREATE TABLE IF NOT EXISTS cleanup_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                operation TEXT NOT NULL,
                users_affected INTEGER DEFAULT 0,
                details TEXT,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Retry the insert
            INSERT INTO cleanup_logs (operation, users_affected, details, executed_at)
            VALUES (op, users_count, details_text, NOW());
        EXCEPTION
            WHEN OTHERS THEN
                RAISE EXCEPTION 'Failed to log cleanup operation: %', SQLERRM;
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION enable_cleanup_schedule() TO authenticated;
GRANT EXECUTE ON FUNCTION disable_cleanup_schedule() TO authenticated;
GRANT EXECUTE ON FUNCTION log_cleanup_operation(TEXT, INTEGER, TEXT) TO authenticated;

-- Add comments
COMMENT ON FUNCTION enable_cleanup_schedule IS 'Enable automatic cleanup schedule (placeholder for pg_cron integration)';
COMMENT ON FUNCTION disable_cleanup_schedule IS 'Disable automatic cleanup schedule (placeholder for pg_cron integration)';
COMMENT ON FUNCTION log_cleanup_operation IS 'Log cleanup operations to cleanup_logs table';