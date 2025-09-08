-- Rollback Admin Dashboard Schema Migration
-- Rollback: 001_admin_dashboard_schema
-- Description: Remove new tables and columns added for admin dashboard functionality
-- Date: 2025-01-09

BEGIN;

-- Drop new tables (in reverse order of dependencies)
DROP TABLE IF EXISTS public.admin_audit_log CASCADE;
DROP TABLE IF EXISTS public.profanity_words CASCADE;
DROP TABLE IF EXISTS public.bots CASCADE;
DROP TABLE IF EXISTS public.bans CASCADE;
DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.site_settings CASCADE;

-- Remove new columns from users table
ALTER TABLE public.users 
DROP COLUMN IF EXISTS kicked_at,
DROP COLUMN IF EXISTS kick_reason,
DROP COLUMN IF EXISTS ban_expires_at,
DROP COLUMN IF EXISTS ban_reason,
DROP COLUMN IF EXISTS is_banned,
DROP COLUMN IF EXISTS is_kicked;

COMMIT;