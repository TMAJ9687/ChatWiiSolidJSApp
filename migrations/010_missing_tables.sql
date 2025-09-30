-- Migration 010: Add missing tables for cleanup and kick functionality
-- This migration adds tables that services are expecting but may not exist

-- Create cleanup_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS cleanup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation TEXT NOT NULL,
    users_affected INTEGER DEFAULT 0,
    details TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_kick_status table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_kick_status (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    is_kicked BOOLEAN DEFAULT false,
    kicked_at TIMESTAMP WITH TIME ZONE,
    kicked_by UUID REFERENCES users(id),
    reason TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_executed_at ON cleanup_logs(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_operation ON cleanup_logs(operation);

CREATE INDEX IF NOT EXISTS idx_user_kick_status_expires_at ON user_kick_status(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_kick_status_kicked_by ON user_kick_status(kicked_by);
CREATE INDEX IF NOT EXISTS idx_user_kick_status_is_kicked ON user_kick_status(is_kicked);

-- Add RLS policies for cleanup_logs
ALTER TABLE cleanup_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read cleanup logs
CREATE POLICY "Admins can read cleanup logs" ON cleanup_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- System can insert cleanup logs
CREATE POLICY "System can insert cleanup logs" ON cleanup_logs
    FOR INSERT
    WITH CHECK (true);

-- Add RLS policies for user_kick_status
ALTER TABLE user_kick_status ENABLE ROW LEVEL SECURITY;

-- Admins can read all kick statuses
CREATE POLICY "Admins can read kick status" ON user_kick_status
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Users can read their own kick status
CREATE POLICY "Users can read own kick status" ON user_kick_status
    FOR SELECT
    USING (user_id = auth.uid());

-- Admins can insert/update kick status
CREATE POLICY "Admins can manage kick status" ON user_kick_status
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- System can manage kick status (for automated processes)
CREATE POLICY "System can manage kick status" ON user_kick_status
    FOR ALL
    USING (true);

-- Add comments
COMMENT ON TABLE cleanup_logs IS 'Logs of cleanup operations performed on the system';
COMMENT ON TABLE user_kick_status IS 'Tracks kicked users and their kick expiration times';

-- Grant permissions
GRANT SELECT ON cleanup_logs TO authenticated;
GRANT INSERT ON cleanup_logs TO authenticated;

GRANT SELECT ON user_kick_status TO authenticated;
GRANT INSERT, UPDATE, DELETE ON user_kick_status TO authenticated;