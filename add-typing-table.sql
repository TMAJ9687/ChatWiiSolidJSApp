-- Add missing typing table to existing Supabase database
-- Run this script in your Supabase SQL editor

-- Create typing table for typing indicators (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.typing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_nickname TEXT NOT NULL,
    is_typing BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 seconds',
    UNIQUE(conversation_id, user_id)
);

-- Add index for typing table (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_typing_conversation 
ON public.typing(conversation_id, is_typing, expires_at) 
WHERE is_typing = true;

-- Enable RLS on typing table
ALTER TABLE public.typing ENABLE ROW LEVEL SECURITY;

-- Add typing table policies (drop existing ones first to avoid conflicts)
DROP POLICY IF EXISTS "Users can read typing indicators when authenticated" ON public.typing;
DROP POLICY IF EXISTS "Users can manage their own typing indicators" ON public.typing;

CREATE POLICY "Users can read typing indicators when authenticated" ON public.typing
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage their own typing indicators" ON public.typing
    FOR ALL USING (auth.uid() = user_id);

-- Add typing table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing;