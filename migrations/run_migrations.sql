-- Admin Dashboard Migration Runner
-- Description: Execute all admin dashboard migrations in correct order
-- Date: 2025-01-09
-- 
-- Instructions:
-- 1. Run this script in your Supabase SQL editor
-- 2. Check for any errors after each migration
-- 3. If errors occur, use the rollback scripts in reverse order

-- Migration 000: Setup tracking
\i 000_migration_tracking.sql

-- Migration 001: Schema Setup
\i 001_admin_dashboard_schema.sql

-- Migration 002: Indexes
\i 002_admin_dashboard_indexes.sql

-- Migration 003: RLS Policies
\i 003_admin_dashboard_rls_policies.sql

-- Migration 004: Functions
\i 004_admin_dashboard_functions.sql

-- Migration 005: Realtime
\i 005_admin_dashboard_realtime.sql

-- Insert default site settings
INSERT INTO public.site_settings (key, value, type) VALUES
('adsense_link_1', '', 'string'),
('adsense_link_2', '', 'string'),
('adsense_link_3', '', 'string'),
('maintenance_mode', 'false', 'boolean'),
('max_image_uploads_standard', '10', 'number'),
('vip_price_monthly', '9.99', 'number'),
('vip_price_quarterly', '24.99', 'number'),
('vip_price_yearly', '89.99', 'number')
ON CONFLICT (key) DO NOTHING;

-- Verify migrations completed successfully
SELECT 'Migration completed successfully' as status;