-- Rollback Admin Dashboard Realtime Migration
-- Rollback: 005_admin_dashboard_realtime
-- Description: Remove realtime subscriptions for admin dashboard tables
-- Date: 2025-01-09

BEGIN;

-- Remove tables from realtime publication (if they still exist)
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.site_settings;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.bans;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.bots;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.profanity_words;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.admin_audit_log;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.feedback;

COMMIT;