-- Supabase Database Setup Script
-- Run this script in your Supabase SQL editor

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

-- Create indexes for better performance
CREATE INDEX idx_messages_sender_receiver ON public.messages(sender_id, receiver_id, created_at);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);
CREATE INDEX idx_messages_unread ON public.messages(receiver_id, read, created_at) WHERE read = false;
CREATE INDEX idx_reactions_message ON public.reactions(message_id, created_at);
CREATE INDEX idx_blocks_blocker ON public.blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON public.blocks(blocked_id);
CREATE INDEX idx_reports_status ON public.reports(status, created_at);
CREATE INDEX idx_photo_usage_user_date ON public.photo_usage(user_id, date);
CREATE INDEX idx_presence_online ON public.presence(online, last_seen) WHERE online = true;
CREATE INDEX idx_typing_conversation ON public.typing(conversation_id, is_typing, expires_at) WHERE is_typing = true AND expires_at > NOW();

-- Create function to generate conversation ID
CREATE OR REPLACE FUNCTION generate_conversation_id(user1_id UUID, user2_id UUID)
RETURNS TEXT AS $$
BEGIN
    -- Sort UUIDs to ensure consistent conversation ID
    IF user1_id < user2_id THEN
        RETURN user1_id::TEXT || '_' || user2_id::TEXT;
    ELSE
        RETURN user2_id::TEXT || '_' || user1_id::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for photo_usage updated_at
CREATE TRIGGER update_photo_usage_updated_at 
    BEFORE UPDATE ON public.photo_usage 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can read all user profiles when authenticated" ON public.users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Messages table policies
CREATE POLICY "Users can read their own messages" ON public.messages
    FOR SELECT USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id
    );

CREATE POLICY "Users can create messages as sender" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their messages" ON public.messages
    FOR UPDATE USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id
    );

-- Reactions table policies
CREATE POLICY "Users can read all reactions when authenticated" ON public.reactions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create their own reactions" ON public.reactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions" ON public.reactions
    FOR DELETE USING (auth.uid() = user_id);

-- Blocks table policies
CREATE POLICY "Users can read their own blocks" ON public.blocks
    FOR SELECT USING (
        auth.uid() = blocker_id OR 
        auth.uid() = blocked_id
    );

CREATE POLICY "Users can create blocks as blocker" ON public.blocks
    FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks" ON public.blocks
    FOR DELETE USING (auth.uid() = blocker_id);

-- Reports table policies (only admins can read via service role)
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

-- Create realtime publication for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing;