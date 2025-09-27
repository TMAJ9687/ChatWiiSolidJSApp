-- =====================================================
-- COMPLETE SUPABASE DATABASE SETUP FOR CHATWII
-- =====================================================
-- This script contains ALL the SQL needed to recreate your ChatWii database
-- Run this script in your NEW Supabase SQL editor in the order presented
--
-- IMPORTANT: Replace YOUR_NEW_PROJECT_URL and YOUR_NEW_ANON_KEY in your .env files after setup
-- =====================================================

-- =====================================================
-- STEP 1: CORE DATABASE SCHEMA
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nickname TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'standard' CHECK (role IN ('standard', 'vip', 'admin')),
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    age INTEGER NOT NULL CHECK (age >= 13 AND age <= 120),
    country TEXT NOT NULL,
    avatar TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'banned', 'kicked')),
    last_seen TIMESTAMPTZ,
    online BOOLEAN NOT NULL DEFAULT false,
    vip_expires_at TIMESTAMPTZ
);

-- Create messages table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'voice')),
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read')),
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    conversation_id TEXT NOT NULL,
    image_url TEXT,
    voice_data JSONB,
    reply_to_id UUID,
    reply_to_message JSONB,
    sender_nickname TEXT
);

-- Create reactions table
CREATE TABLE public.reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_nickname TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- Create blocks table
CREATE TABLE public.blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT,
    UNIQUE(blocker_id, blocked_id)
);

-- Create reports table
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reported_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Create photo_usage table
CREATE TABLE public.photo_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Create presence table for real-time user presence
CREATE TABLE public.presence (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    online BOOLEAN NOT NULL DEFAULT false,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    nickname TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    age INTEGER NOT NULL,
    country TEXT NOT NULL,
    role TEXT NOT NULL,
    avatar TEXT NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create typing table for typing indicators
CREATE TABLE public.typing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_nickname TEXT NOT NULL,
    is_typing BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 seconds',
    UNIQUE(conversation_id, user_id)
);

-- Create feedback table
CREATE TABLE public.feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    email TEXT,
    feedback_text TEXT NOT NULL CHECK (LENGTH(TRIM(feedback_text)) > 0),
    user_nickname TEXT,
    user_agent TEXT,
    ip_address INET,
    status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- STEP 2: ADMIN TABLES
-- =====================================================

-- Admin audit log table
CREATE TABLE public.admin_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    admin_nickname TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('user', 'report', 'message', 'system')),
    target_id UUID,
    target_info JSONB,
    reason TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin session tracking
CREATE TABLE public.admin_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    admin_nickname TEXT NOT NULL,
    login_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logout_time TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    session_duration INTERVAL GENERATED ALWAYS AS (logout_time - login_time) STORED
);

-- Admin settings/preferences
CREATE TABLE public.admin_settings (
    admin_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN DEFAULT true,
    auto_logout_minutes INTEGER DEFAULT 60,
    theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System-wide admin announcements
CREATE TABLE public.admin_announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    admin_nickname TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'maintenance', 'feature')),
    active BOOLEAN DEFAULT true,
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    target_roles TEXT[] DEFAULT ARRAY['standard', 'vip'],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- STEP 3: INDEXES FOR PERFORMANCE
-- =====================================================

-- Core table indexes
CREATE INDEX idx_messages_sender_receiver ON public.messages(sender_id, receiver_id, created_at);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);
CREATE INDEX idx_messages_unread ON public.messages(receiver_id, read, created_at) WHERE read = false;
CREATE INDEX idx_reactions_message ON public.reactions(message_id, created_at);
CREATE INDEX idx_blocks_blocker ON public.blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON public.blocks(blocked_id);
CREATE INDEX idx_reports_status ON public.reports(status, created_at);
CREATE INDEX idx_photo_usage_user_date ON public.photo_usage(user_id, date);
CREATE INDEX idx_presence_online ON public.presence(online, last_seen) WHERE online = true;
CREATE INDEX idx_typing_conversation ON public.typing(conversation_id, is_typing, expires_at) WHERE is_typing = true;

-- Feedback indexes
CREATE INDEX idx_feedback_status ON public.feedback(status, created_at DESC);
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX idx_feedback_user_id ON public.feedback(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_feedback_email ON public.feedback(email, created_at DESC) WHERE email IS NOT NULL;

-- Admin table indexes
CREATE INDEX idx_admin_logs_admin_id ON public.admin_logs(admin_id, created_at DESC);
CREATE INDEX idx_admin_logs_action ON public.admin_logs(action, created_at DESC);
CREATE INDEX idx_admin_logs_target ON public.admin_logs(target_type, target_id, created_at DESC);
CREATE INDEX idx_admin_sessions_admin_id ON public.admin_sessions(admin_id, login_time DESC);
CREATE INDEX idx_admin_announcements_active ON public.admin_announcements(active, start_date DESC) WHERE active = true;

-- =====================================================
-- STEP 4: FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to generate conversation ID
CREATE OR REPLACE FUNCTION generate_conversation_id(user1_id UUID, user2_id UUID)
RETURNS TEXT AS $$
BEGIN
    IF user1_id < user2_id THEN
        RETURN user1_id::TEXT || '_' || user2_id::TEXT;
    ELSE
        RETURN user2_id::TEXT || '_' || user1_id::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update feedback updated_at
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update admin settings updated_at
CREATE OR REPLACE FUNCTION update_admin_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
    p_admin_id UUID,
    p_action TEXT,
    p_target_type TEXT,
    p_target_id UUID DEFAULT NULL,
    p_target_info JSONB DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    log_id UUID;
    admin_nick TEXT;
BEGIN
    SELECT nickname INTO admin_nick
    FROM public.users
    WHERE id = p_admin_id AND role = 'admin';

    IF admin_nick IS NULL THEN
        RAISE EXCEPTION 'Invalid admin ID or user is not an admin';
    END IF;

    INSERT INTO public.admin_logs (
        admin_id, admin_nickname, action, target_type,
        target_id, target_info, reason, details
    ) VALUES (
        p_admin_id, admin_nick, p_action, p_target_type,
        p_target_id, p_target_info, p_reason, p_details
    ) RETURNING id INTO log_id;

    RETURN log_id;
END;
$$;

-- Function to get admin dashboard stats
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stats JSONB;
    requesting_user_role TEXT;
BEGIN
    SELECT role INTO requesting_user_role
    FROM public.users
    WHERE id = auth.uid();

    IF requesting_user_role != 'admin' THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    SELECT jsonb_build_object(
        'totalUsers', (SELECT COUNT(*) FROM public.users),
        'activeUsers', (SELECT COUNT(*) FROM public.users WHERE status = 'active'),
        'bannedUsers', (SELECT COUNT(*) FROM public.users WHERE status = 'banned'),
        'kickedUsers', (SELECT COUNT(*) FROM public.users WHERE status = 'kicked'),
        'vipUsers', (SELECT COUNT(*) FROM public.users WHERE role = 'vip'),
        'onlineUsers', (SELECT COUNT(*) FROM public.presence WHERE online = true),
        'totalReports', (SELECT COUNT(*) FROM public.reports),
        'pendingReports', (SELECT COUNT(*) FROM public.reports WHERE status = 'pending'),
        'resolvedReports', (SELECT COUNT(*) FROM public.reports WHERE status = 'resolved'),
        'totalMessages', (SELECT COUNT(*) FROM public.messages),
        'totalBlocks', (SELECT COUNT(*) FROM public.blocks),
        'adminActions24h', (
            SELECT COUNT(*) FROM public.admin_logs
            WHERE created_at > NOW() - INTERVAL '24 hours'
        )
    ) INTO stats;

    RETURN stats;
END;
$$;

-- Function to safely update user status
CREATE OR REPLACE FUNCTION admin_update_user_status(
    p_target_user_id UUID,
    p_new_status TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_user_id UUID;
    admin_role TEXT;
    target_user RECORD;
    old_status TEXT;
BEGIN
    admin_user_id := auth.uid();

    SELECT role INTO admin_role
    FROM public.users
    WHERE id = admin_user_id;

    IF admin_role != 'admin' THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    IF p_new_status NOT IN ('active', 'banned', 'kicked') THEN
        RAISE EXCEPTION 'Invalid status. Must be: active, banned, or kicked';
    END IF;

    SELECT * INTO target_user
    FROM public.users
    WHERE id = p_target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    old_status := target_user.status;

    UPDATE public.users
    SET status = p_new_status
    WHERE id = p_target_user_id;

    IF p_new_status IN ('banned', 'kicked') THEN
        UPDATE public.presence
        SET online = false, last_seen = NOW()
        WHERE user_id = p_target_user_id;
    END IF;

    PERFORM log_admin_action(
        admin_user_id,
        'update_user_status',
        'user',
        p_target_user_id,
        jsonb_build_object(
            'nickname', target_user.nickname,
            'old_status', old_status,
            'new_status', p_new_status
        ),
        p_reason
    );

    RETURN TRUE;
END;
$$;

-- Create triggers
CREATE TRIGGER update_photo_usage_updated_at
    BEFORE UPDATE ON public.photo_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_updated_at_trigger
    BEFORE UPDATE ON public.feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_updated_at();

CREATE TRIGGER update_admin_settings_updated_at_trigger
    BEFORE UPDATE ON public.admin_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_settings_updated_at();

-- =====================================================
-- STEP 5: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_announcements ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can read all user profiles when authenticated" ON public.users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Messages table policies
CREATE POLICY "Users can read their own messages" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create messages as sender" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their messages" ON public.messages
    FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Reactions table policies
CREATE POLICY "Users can read all reactions when authenticated" ON public.reactions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create their own reactions" ON public.reactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions" ON public.reactions
    FOR DELETE USING (auth.uid() = user_id);

-- Blocks table policies
CREATE POLICY "Users can read their own blocks" ON public.blocks
    FOR SELECT USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

CREATE POLICY "Users can create blocks as blocker" ON public.blocks
    FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks" ON public.blocks
    FOR DELETE USING (auth.uid() = blocker_id);

-- Reports table policies
CREATE POLICY "Users can create reports" ON public.reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Photo usage table policies
CREATE POLICY "Users can read their own photo usage" ON public.photo_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own photo usage" ON public.photo_usage
    FOR ALL USING (auth.uid() = user_id);

-- Presence table policies
CREATE POLICY "Users can read all presence when authenticated" ON public.presence
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage their own presence" ON public.presence
    FOR ALL USING (auth.uid() = user_id);

-- Typing table policies
CREATE POLICY "Users can read typing indicators when authenticated" ON public.typing
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage their own typing indicators" ON public.typing
    FOR ALL USING (auth.uid() = user_id);

-- Feedback table policies
CREATE POLICY "Anyone can create feedback" ON public.feedback
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read their own feedback" ON public.feedback
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all feedback" ON public.feedback
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can update feedback" ON public.feedback
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Admin table policies
CREATE POLICY "Only admins can read admin logs" ON public.admin_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Only admins can insert admin logs" ON public.admin_logs
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin' AND id = admin_id)
    );

CREATE POLICY "Admins can read their own sessions" ON public.admin_sessions
    FOR SELECT USING (
        auth.uid() = admin_id AND
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can manage their own sessions" ON public.admin_sessions
    FOR ALL USING (
        auth.uid() = admin_id AND
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can manage their own settings" ON public.admin_settings
    FOR ALL USING (
        auth.uid() = admin_id AND
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Only admins can manage announcements" ON public.admin_announcements
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "All users can read active announcements" ON public.admin_announcements
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        active = true AND
        (start_date IS NULL OR start_date <= NOW()) AND
        (end_date IS NULL OR end_date > NOW())
    );

-- =====================================================
-- STEP 6: STORAGE SETUP
-- =====================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
    ('avatars', 'avatars', true),
    ('chat-images', 'chat-images', true),
    ('voice-messages', 'voice-messages', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Avatar images are publicly readable" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Chat images are publicly readable" ON storage.objects
    FOR SELECT USING (bucket_id = 'chat-images');

CREATE POLICY "Authenticated users can upload chat images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'chat-images' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Voice messages are publicly readable" ON storage.objects
    FOR SELECT USING (bucket_id = 'voice-messages');

CREATE POLICY "Authenticated users can upload voice messages" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'voice-messages' AND
        auth.role() = 'authenticated'
    );

-- =====================================================
-- STEP 7: REALTIME SETUP
-- =====================================================

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_announcements;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Your database is now ready. Don't forget to:
-- 1. Update your .env files with the new Supabase URL and anon key
-- 2. Create an admin user if needed
-- 3. Test the application with the new database
-- =====================================================