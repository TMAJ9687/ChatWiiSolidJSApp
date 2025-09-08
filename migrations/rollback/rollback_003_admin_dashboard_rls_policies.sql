-- Rollback Admin Dashboard RLS Policies Migration
-- Rollback: 003_admin_dashboard_rls_policies
-- Description: Remove Row Level Security policies for admin dashboard tables
-- Date: 2025-01-09

BEGIN;

-- Drop RLS policies for site_settings
DROP POLICY IF EXISTS "Only admins can read site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Only admins can manage site settings" ON public.site_settings;

-- Drop RLS policies for bans
DROP POLICY IF EXISTS "Only admins can read bans" ON public.bans;
DROP POLICY IF EXISTS "Only admins can manage bans" ON public.bans;

-- Drop RLS policies for bots
DROP POLICY IF EXISTS "Only admins can read bots" ON public.bots;
DROP POLICY IF EXISTS "Only admins can manage bots" ON public.bots;

-- Drop RLS policies for profanity_words
DROP POLICY IF EXISTS "Only admins can read profanity words" ON public.profanity_words;
DROP POLICY IF EXISTS "Only admins can manage profanity words" ON public.profanity_words;

-- Drop RLS policies for admin_audit_log
DROP POLICY IF EXISTS "Only admins can read audit log" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Only admins can create audit log entries" ON public.admin_audit_log;

-- Drop RLS policies for feedback
DROP POLICY IF EXISTS "Users can create feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can read their own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Only admins can update feedback" ON public.feedback;

-- Disable RLS on tables (if they still exist)
ALTER TABLE IF EXISTS public.site_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bans DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bots DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profanity_words DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feedback DISABLE ROW LEVEL SECURITY;

COMMIT;