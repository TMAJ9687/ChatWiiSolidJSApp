-- Admin Dashboard Functions Migration
-- Migration: 004_admin_dashboard_functions
-- Description: Create utility functions for admin dashboard operations
-- Date: 2025-01-09

BEGIN;

-- Function to update updated_at timestamp for site_settings
CREATE OR REPLACE FUNCTION update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for site_settings updated_at
DROP TRIGGER IF EXISTS update_site_settings_updated_at_trigger ON public.site_settings;
CREATE TRIGGER update_site_settings_updated_at_trigger
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_site_settings_updated_at();

-- Function to update updated_at timestamp for feedback
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for feedback updated_at
DROP TRIGGER IF EXISTS update_feedback_updated_at_trigger ON public.feedback;
CREATE TRIGGER update_feedback_updated_at_trigger
    BEFORE UPDATE ON public.feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_updated_at();

-- Function to automatically expire bans
CREATE OR REPLACE FUNCTION expire_bans()
RETURNS void AS $$
BEGIN
    UPDATE public.bans 
    SET is_active = false 
    WHERE is_active = true 
    AND expires_at IS NOT NULL 
    AND expires_at <= NOW();
    
    -- Update users table to reflect ban expiry
    UPDATE public.users 
    SET is_banned = false, 
        ban_expires_at = NULL, 
        ban_reason = NULL
    WHERE is_banned = true 
    AND ban_expires_at IS NOT NULL 
    AND ban_expires_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to automatically expire kicks (after 24 hours)
CREATE OR REPLACE FUNCTION expire_kicks()
RETURNS void AS $$
BEGIN
    UPDATE public.users 
    SET is_kicked = false, 
        kicked_at = NULL, 
        kick_reason = NULL
    WHERE is_kicked = true 
    AND kicked_at IS NOT NULL 
    AND kicked_at <= NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is currently banned
CREATE OR REPLACE FUNCTION is_user_banned(user_uuid UUID)
RETURNS boolean AS $$
DECLARE
    banned boolean := false;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.bans 
        WHERE user_id = user_uuid 
        AND is_active = true 
        AND (expires_at IS NULL OR expires_at > NOW())
    ) INTO banned;
    
    RETURN banned;
END;
$$ LANGUAGE plpgsql;

-- Function to check if IP is currently banned
CREATE OR REPLACE FUNCTION is_ip_banned(ip_addr INET)
RETURNS boolean AS $$
DECLARE
    banned boolean := false;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.bans 
        WHERE ip_address = ip_addr 
        AND is_active = true 
        AND (expires_at IS NULL OR expires_at > NOW())
    ) INTO banned;
    
    RETURN banned;
END;
$$ LANGUAGE plpgsql;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
    admin_uuid UUID,
    action_name VARCHAR(100),
    target_type_name VARCHAR(50),
    target_uuid UUID DEFAULT NULL,
    action_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.admin_audit_log (
        admin_id, 
        action, 
        target_type, 
        target_id, 
        details
    ) VALUES (
        admin_uuid, 
        action_name, 
        target_type_name, 
        target_uuid, 
        action_details
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;