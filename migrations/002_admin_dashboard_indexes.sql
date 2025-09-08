-- Admin Dashboard Indexes Migration
-- Migration: 002_admin_dashboard_indexes
-- Description: Create performance indexes for admin dashboard tables
-- Date: 2025-01-09

BEGIN;

-- Indexes for users table new columns
CREATE INDEX IF NOT EXISTS idx_users_kicked_at ON public.users(kicked_at) WHERE is_kicked = true;
CREATE INDEX IF NOT EXISTS idx_users_ban_expires ON public.users(ban_expires_at) WHERE is_banned = true;
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON public.users(is_banned) WHERE is_banned = true;
CREATE INDEX IF NOT EXISTS idx_users_is_kicked ON public.users(is_kicked) WHERE is_kicked = true;
CREATE INDEX IF NOT EXISTS idx_users_role_online ON public.users(role, online) WHERE online = true;

-- Indexes for site_settings table
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON public.site_settings(key);
CREATE INDEX IF NOT EXISTS idx_site_settings_type ON public.site_settings(type);

-- Indexes for bans table
CREATE INDEX IF NOT EXISTS idx_bans_user_id ON public.bans(user_id);
CREATE INDEX IF NOT EXISTS idx_bans_ip_address ON public.bans(ip_address);
CREATE INDEX IF NOT EXISTS idx_bans_is_active ON public.bans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_bans_expires_at ON public.bans(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bans_banned_by ON public.bans(banned_by);
CREATE INDEX IF NOT EXISTS idx_bans_created_at ON public.bans(created_at);

-- Indexes for bots table
CREATE INDEX IF NOT EXISTS idx_bots_user_id ON public.bots(user_id);
CREATE INDEX IF NOT EXISTS idx_bots_is_active ON public.bots(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_bots_created_by ON public.bots(created_by);
CREATE INDEX IF NOT EXISTS idx_bots_created_at ON public.bots(created_at);

-- Indexes for profanity_words table
CREATE INDEX IF NOT EXISTS idx_profanity_words_type ON public.profanity_words(type);
CREATE INDEX IF NOT EXISTS idx_profanity_words_word ON public.profanity_words(word);
CREATE INDEX IF NOT EXISTS idx_profanity_words_created_by ON public.profanity_words(created_by);

-- Indexes for admin_audit_log table
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON public.admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON public.admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_type ON public.admin_audit_log(target_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_id ON public.admin_audit_log(target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at);

-- Indexes for feedback table
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at);

COMMIT;