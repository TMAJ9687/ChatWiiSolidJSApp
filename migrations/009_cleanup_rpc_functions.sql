-- Migration 009: Add cleanup RPC functions
-- This migration adds the missing RPC functions for cleanup management

-- Function to enable cleanup schedule
CREATE OR REPLACE FUNCTION enable_cleanup_schedule()
RETURNS JSONB AS $$
BEGIN
    -- This is a placeholder function since pg_cron may not be available
    -- In production, this would interface with pg_cron extension
    
    -- Log the attempt
    INSERT INTO audit_logs (admin_id, action, target_type, target_id, details, created_at)
    VALUES (
        'system',
        'enable_cleanup_schedule',
        'system',
        'cleanup-scheduler',
        jsonb_build_object(
            'status', 'enabled',
            'schedule', 'every hour',
            'note', 'Placeholder implementation - pg_cron not available'
        ),
        NOW()
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Automatic cleanup schedule enabled (placeholder implementation)'
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
BEGIN
    -- This is a placeholder function since pg_cron may not be available
    -- In production, this would interface with pg_cron extension
    
    -- Log the attempt
    INSERT INTO audit_logs (admin_id, action, target_type, target_id, details, created_at)
    VALUES (
        'system',
        'disable_cleanup_schedule',
        'system',
        'cleanup-scheduler',
        jsonb_build_object(
            'status', 'disabled',
            'note', 'Placeholder implementation - pg_cron not available'
        ),
        NOW()
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Automatic cleanup schedule disabled (placeholder implementation)'
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