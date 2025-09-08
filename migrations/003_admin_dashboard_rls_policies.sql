-- Admin Dashboard RLS Policies Migration
-- Migration: 003_admin_dashboard_rls_policies
-- Description: Create Row Level Security policies for admin dashboard tables
-- Date: 2025-01-09

BEGIN;

-- Enable RLS on new tables
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profanity_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Site Settings Policies (Admin only)
CREATE POLICY "Only admins can read site settings" ON public.site_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can manage site settings" ON public.site_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Bans Policies (Admin only)
CREATE POLICY "Only admins can read bans" ON public.bans
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can manage bans" ON public.bans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Bots Policies (Admin only)
CREATE POLICY "Only admins can read bots" ON public.bots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can manage bots" ON public.bots
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Profanity Words Policies (Admin only)
CREATE POLICY "Only admins can read profanity words" ON public.profanity_words
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can manage profanity words" ON public.profanity_words
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admin Audit Log Policies (Admin only)
CREATE POLICY "Only admins can read audit log" ON public.admin_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can create audit log entries" ON public.admin_audit_log
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Feedback Policies
CREATE POLICY "Users can create feedback" ON public.feedback
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR user_id IS NULL
    );

CREATE POLICY "Users can read their own feedback" ON public.feedback
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can update feedback" ON public.feedback
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

COMMIT;