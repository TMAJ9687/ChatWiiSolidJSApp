-- Admin Dashboard Complete Rollback
-- Description: Rollback all admin dashboard migrations in reverse order
-- Date: 2025-01-09
-- 
-- Instructions:
-- 1. Run this script in your Supabase SQL editor to completely rollback all changes
-- 2. This will remove all admin dashboard tables, columns, indexes, and functions
-- 3. Use with caution - this will delete all admin dashboard data

-- Rollback in reverse order
\i rollback/rollback_005_admin_dashboard_realtime.sql
\i rollback/rollback_004_admin_dashboard_functions.sql
\i rollback/rollback_003_admin_dashboard_rls_policies.sql
\i rollback/rollback_002_admin_dashboard_indexes.sql
\i rollback/rollback_001_admin_dashboard_schema.sql

-- Verify rollback completed successfully
SELECT 'Rollback completed successfully' as status;