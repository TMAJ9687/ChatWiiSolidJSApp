-- Migration 008: Audit Log Retention and Cleanup
-- This migration adds automated audit log retention policies

-- Function to clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cutoff_date TIMESTAMP WITH TIME ZONE;
    deleted_count INTEGER;
BEGIN
    -- Calculate cutoff date
    cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
    
    -- Delete old audit logs
    WITH deleted AS (
        DELETE FROM admin_audit_log 
        WHERE created_at < cutoff_date
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    -- Log the cleanup action if any records were deleted
    IF deleted_count > 0 THEN
        INSERT INTO admin_audit_log (
            id,
            admin_id,
            action,
            target_type,
            details,
            created_at
        ) VALUES (
            gen_random_uuid(),
            'system',
            'audit_log_cleanup',
            'setting',
            jsonb_build_object(
                'deleted_count', deleted_count,
                'retention_days', retention_days,
                'cutoff_date', cutoff_date
            ),
            NOW()
        );
    END IF;
    
    RETURN deleted_count;
END;
$$;

-- Function to archive old audit logs before deletion
CREATE OR REPLACE FUNCTION archive_old_audit_logs(
    retention_days INTEGER DEFAULT 365,
    archive_table_suffix TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cutoff_date TIMESTAMP WITH TIME ZONE;
    archive_table_name TEXT;
    archived_count INTEGER;
BEGIN
    -- Calculate cutoff date
    cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
    
    -- Generate archive table name
    IF archive_table_suffix IS NULL THEN
        archive_table_suffix := to_char(NOW(), 'YYYY_MM');
    END IF;
    archive_table_name := 'admin_audit_log_archive_' || archive_table_suffix;
    
    -- Create archive table if it doesn't exist
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            LIKE admin_audit_log INCLUDING ALL
        )', archive_table_name);
    
    -- Move old records to archive table
    EXECUTE format('
        WITH moved AS (
            DELETE FROM admin_audit_log 
            WHERE created_at < $1
            RETURNING *
        )
        INSERT INTO %I SELECT * FROM moved
    ', archive_table_name) USING cutoff_date;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    -- Log the archival action
    IF archived_count > 0 THEN
        INSERT INTO admin_audit_log (
            id,
            admin_id,
            action,
            target_type,
            details,
            created_at
        ) VALUES (
            gen_random_uuid(),
            'system',
            'audit_log_archive',
            'setting',
            jsonb_build_object(
                'archived_count', archived_count,
                'retention_days', retention_days,
                'cutoff_date', cutoff_date,
                'archive_table', archive_table_name
            ),
            NOW()
        );
    END IF;
    
    RETURN archived_count;
END;
$$;

-- Function to get audit log statistics
CREATE OR REPLACE FUNCTION get_audit_log_statistics(
    date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stats JSONB;
    total_entries INTEGER;
    date_filter TEXT := '';
BEGIN
    -- Build date filter if provided
    IF date_from IS NOT NULL THEN
        date_filter := date_filter || ' AND created_at >= ''' || date_from || '''';
    END IF;
    
    IF date_to IS NOT NULL THEN
        date_filter := date_filter || ' AND created_at <= ''' || date_to || '''';
    END IF;
    
    -- Get total entries
    EXECUTE 'SELECT COUNT(*) FROM admin_audit_log WHERE 1=1' || date_filter INTO total_entries;
    
    -- Build comprehensive statistics
    EXECUTE format('
        WITH action_stats AS (
            SELECT action, COUNT(*) as count
            FROM admin_audit_log 
            WHERE 1=1 %s
            GROUP BY action
        ),
        target_stats AS (
            SELECT target_type, COUNT(*) as count
            FROM admin_audit_log 
            WHERE 1=1 %s
            GROUP BY target_type
        ),
        admin_stats AS (
            SELECT admin_id, COUNT(*) as count
            FROM admin_audit_log 
            WHERE 1=1 %s
            GROUP BY admin_id
        ),
        daily_stats AS (
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM admin_audit_log 
            WHERE 1=1 %s
            GROUP BY DATE(created_at)
            ORDER BY date
        )
        SELECT jsonb_build_object(
            ''total_entries'', %s,
            ''entries_by_action'', (SELECT jsonb_object_agg(action, count) FROM action_stats),
            ''entries_by_target_type'', (SELECT jsonb_object_agg(target_type, count) FROM target_stats),
            ''entries_by_admin'', (SELECT jsonb_object_agg(admin_id, count) FROM admin_stats),
            ''daily_activity'', (SELECT jsonb_agg(jsonb_build_object(''date'', date, ''count'', count)) FROM daily_stats)
        )', 
        date_filter, date_filter, date_filter, date_filter, total_entries
    ) INTO stats;
    
    RETURN stats;
END;
$$;

-- Create indexes for better performance on audit log queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_type ON admin_audit_log(target_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_id ON admin_audit_log(target_id);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_date ON admin_audit_log(admin_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_date ON admin_audit_log(target_type, target_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action_date ON admin_audit_log(action, created_at);

-- Create GIN index for details JSONB column for better search performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_details_gin ON admin_audit_log USING GIN(details);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION archive_old_audit_logs(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_log_statistics(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;

-- Create a scheduled job to run cleanup weekly (requires pg_cron extension)
-- This is commented out as it requires pg_cron extension to be installed
-- SELECT cron.schedule('audit-log-cleanup', '0 2 * * 0', 'SELECT cleanup_old_audit_logs(365);');