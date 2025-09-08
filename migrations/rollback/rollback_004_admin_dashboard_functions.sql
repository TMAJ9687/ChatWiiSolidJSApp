-- Rollback Admin Dashboard Functions Migration
-- Rollback: 004_admin_dashboard_functions
-- Description: Remove utility functions for admin dashboard operations
-- Date: 2025-01-09

BEGIN;

-- Drop triggers first
DROP TRIGGER IF EXISTS update_site_settings_updated_at_trigger ON public.site_settings;
DROP TRIGGER IF EXISTS update_feedback_updated_at_trigger ON public.feedback;

-- Drop functions
DROP FUNCTION IF EXISTS update_site_settings_updated_at();
DROP FUNCTION IF EXISTS update_feedback_updated_at();
DROP FUNCTION IF EXISTS expire_bans();
DROP FUNCTION IF EXISTS expire_kicks();
DROP FUNCTION IF EXISTS is_user_banned(UUID);
DROP FUNCTION IF EXISTS is_ip_banned(INET);
DROP FUNCTION IF EXISTS log_admin_action(UUID, VARCHAR(100), VARCHAR(50), UUID, JSONB);

COMMIT;