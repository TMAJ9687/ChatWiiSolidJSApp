-- Check if reports table exists and its structure
-- Run this in your Supabase SQL Editor to verify the reports table

-- Check if table exists and show its structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'reports' AND table_schema = 'public'
ORDER BY ordinal_position;

-- If the table doesn't exist or has wrong structure, uncomment and run this:
/*
-- Drop existing table if needed (CAREFUL: This will delete all data!)
-- DROP TABLE IF EXISTS public.reports CASCADE;

-- Create reports table with correct structure
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

-- Create indexes
CREATE INDEX idx_reports_status ON public.reports(status, created_at);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create reports" ON public.reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);
*/