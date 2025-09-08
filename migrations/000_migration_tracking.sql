-- Migration Tracking Setup
-- Description: Create table to track applied migrations
-- Date: 2025-01-09

BEGIN;

-- Create migration tracking table
CREATE TABLE IF NOT EXISTS public.migration_history (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rollback_script VARCHAR(255),
    description TEXT
);

-- Enable RLS on migration_history (admin only)
ALTER TABLE public.migration_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read migration history" ON public.migration_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Insert tracking records for admin dashboard migrations
INSERT INTO public.migration_history (migration_name, rollback_script, description) VALUES
('001_admin_dashboard_schema', 'rollback/rollback_001_admin_dashboard_schema.sql', 'Create new tables and columns for admin dashboard functionality'),
('002_admin_dashboard_indexes', 'rollback/rollback_002_admin_dashboard_indexes.sql', 'Create performance indexes for admin dashboard tables'),
('003_admin_dashboard_rls_policies', 'rollback/rollback_003_admin_dashboard_rls_policies.sql', 'Create Row Level Security policies for admin dashboard tables'),
('004_admin_dashboard_functions', 'rollback/rollback_004_admin_dashboard_functions.sql', 'Create utility functions for admin dashboard operations'),
('005_admin_dashboard_realtime', 'rollback/rollback_005_admin_dashboard_realtime.sql', 'Enable realtime subscriptions for admin dashboard tables')
ON CONFLICT (migration_name) DO NOTHING;

COMMIT;