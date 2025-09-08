-- Rollback Admin Dashboard Indexes Migration
-- Rollback: 002_admin_dashboard_indexes
-- Description: Remove performance indexes for admin dashboard tables
-- Date: 2025-01-09

BEGIN;

-- Drop indexes for users table new columns
DROP INDEX IF EXISTS idx_users_kicked_at;
DROP INDEX IF EXISTS idx_users_ban_expires;
DROP INDEX IF EXISTS idx_users_is_banned;
DROP INDEX IF EXISTS idx_users_is_kicked;
DROP INDEX IF EXISTS idx_users_role_online;

-- Drop indexes for site_settings table
DROP INDEX IF EXISTS idx_site_settings_key;
DROP INDEX IF EXISTS idx_site_settings_type;

-- Drop indexes for bans table
DROP INDEX IF EXISTS idx_bans_user_id;
DROP INDEX IF EXISTS idx_bans_ip_address;
DROP INDEX IF EXISTS idx_bans_is_active;
DROP INDEX IF EXISTS idx_bans_expires_at;
DROP INDEX IF EXISTS idx_bans_banned_by;
DROP INDEX IF EXISTS idx_bans_created_at;

-- Drop indexes for bots table
DROP INDEX IF EXISTS idx_bots_user_id;
DROP INDEX IF EXISTS idx_bots_is_active;
DROP INDEX IF EXISTS idx_bots_created_by;
DROP INDEX IF EXISTS idx_bots_created_at;

-- Drop indexes for profanity_words table
DROP INDEX IF EXISTS idx_profanity_words_type;
DROP INDEX IF EXISTS idx_profanity_words_word;
DROP INDEX IF EXISTS idx_profanity_words_created_by;

-- Drop indexes for admin_audit_log table
DROP INDEX IF EXISTS idx_admin_audit_log_admin_id;
DROP INDEX IF EXISTS idx_admin_audit_log_action;
DROP INDEX IF EXISTS idx_admin_audit_log_target_type;
DROP INDEX IF EXISTS idx_admin_audit_log_target_id;
DROP INDEX IF EXISTS idx_admin_audit_log_created_at;

-- Drop indexes for feedback table
DROP INDEX IF EXISTS idx_feedback_user_id;
DROP INDEX IF EXISTS idx_feedback_status;
DROP INDEX IF EXISTS idx_feedback_created_at;

COMMIT;