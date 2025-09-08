-- Migration 007: Add Version Columns for Optimistic Locking
-- This migration adds version columns to tables that need optimistic locking

-- Add version column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add version column to bans table
ALTER TABLE bans ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add version column to bots table
ALTER TABLE bots ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add version column to site_settings table
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add version column to profanity_words table
ALTER TABLE profanity_words ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add version column to admin_audit_log table
ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create indexes on version columns for performance
CREATE INDEX IF NOT EXISTS idx_users_version ON users(version);
CREATE INDEX IF NOT EXISTS idx_bans_version ON bans(version);
CREATE INDEX IF NOT EXISTS idx_bots_version ON bots(version);
CREATE INDEX IF NOT EXISTS idx_site_settings_version ON site_settings(version);
CREATE INDEX IF NOT EXISTS idx_profanity_words_version ON profanity_words(version);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_version ON admin_audit_log(version);

-- Create triggers to automatically increment version on updates
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = COALESCE(OLD.version, 0) + 1;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply version increment triggers to all tables
DROP TRIGGER IF EXISTS trigger_users_version ON users;
CREATE TRIGGER trigger_users_version
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trigger_bans_version ON bans;
CREATE TRIGGER trigger_bans_version
    BEFORE UPDATE ON bans
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trigger_bots_version ON bots;
CREATE TRIGGER trigger_bots_version
    BEFORE UPDATE ON bots
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trigger_site_settings_version ON site_settings;
CREATE TRIGGER trigger_site_settings_version
    BEFORE UPDATE ON site_settings
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trigger_profanity_words_version ON profanity_words;
CREATE TRIGGER trigger_profanity_words_version
    BEFORE UPDATE ON profanity_words
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trigger_admin_audit_log_version ON admin_audit_log;
CREATE TRIGGER trigger_admin_audit_log_version
    BEFORE UPDATE ON admin_audit_log
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();