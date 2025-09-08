-- Admin Dashboard Realtime Migration
-- Migration: 005_admin_dashboard_realtime
-- Description: Enable realtime subscriptions for admin dashboard tables
-- Date: 2025-01-09

BEGIN;

-- Add new tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profanity_words;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_audit_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback;

COMMIT;