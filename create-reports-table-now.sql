-- Create reports table immediately
-- Copy and paste this into your Supabase SQL Editor and run it

-- Drop existing table if it has wrong schema (WARNING: This deletes existing report data!)
DROP TABLE IF EXISTS public.reports CASCADE;

-- Create reports table with correct schema matching database types
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

-- Create indexes for better performance
CREATE INDEX idx_reports_status ON public.reports(status, created_at);
CREATE INDEX idx_reports_reporter ON public.reports(reporter_id, created_at DESC);
CREATE INDEX idx_reports_reported ON public.reports(reported_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can create reports" ON public.reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can read their own reports" ON public.reports
    FOR SELECT USING (auth.uid() = reporter_id);

-- Admin access policy (admins can read all reports)
CREATE POLICY "Admins can read all reports" ON public.reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update reports" ON public.reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;

-- Verify table was created
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'reports' AND table_schema = 'public'
ORDER BY ordinal_position;