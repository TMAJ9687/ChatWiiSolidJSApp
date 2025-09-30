-- Create feedback table for user feedback system
-- Run this in your Supabase SQL editor

-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Optional - can be null for anonymous feedback
  email TEXT, -- Optional email provided by user
  feedback_text TEXT NOT NULL CHECK (LENGTH(TRIM(feedback_text)) > 0),
  user_nickname TEXT, -- Store nickname at time of feedback for reference
  user_agent TEXT, -- Browser/device info for analytics
  ip_address INET, -- Optional IP for spam prevention
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied')),
  admin_notes TEXT, -- Admin can add notes about the feedback
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_feedback_status ON public.feedback(status, created_at DESC);
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX idx_feedback_user_id ON public.feedback(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_feedback_email ON public.feedback(email, created_at DESC) WHERE email IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can create feedback (including anonymous users)
CREATE POLICY "Anyone can create feedback" ON public.feedback
    FOR INSERT WITH CHECK (true);

-- Users can read their own feedback if they provided user_id
CREATE POLICY "Users can read their own feedback" ON public.feedback
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can read all feedback
CREATE POLICY "Admins can read all feedback" ON public.feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update feedback (status, notes)
CREATE POLICY "Admins can update feedback" ON public.feedback
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_feedback_updated_at_trigger
    BEFORE UPDATE ON public.feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_updated_at();

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback;

-- Verify table was created
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'feedback' AND table_schema = 'public'
ORDER BY ordinal_position;