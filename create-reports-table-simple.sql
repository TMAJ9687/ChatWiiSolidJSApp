-- Create reports table for user reporting system
-- Run this in your Supabase SQL editor

-- Drop table if it exists (for clean setup)
DROP TABLE IF EXISTS public.reports;

-- Create reports table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('under_age', 'abusive', 'scams', 'spam', 'inappropriate', 'other')),
  custom_reason TEXT CHECK (LENGTH(custom_reason) <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '48 hours',
  reviewed BOOLEAN NOT NULL DEFAULT false,
  admin_notes TEXT,
  
  -- Ensure one report per user pair
  UNIQUE(reporter_id, reported_id)
);

-- Create indexes for better performance
CREATE INDEX idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX idx_reports_expires_at ON public.reports(expires_at);
CREATE INDEX idx_reports_reviewed ON public.reports(reviewed);

-- Enable Row Level Security
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can create reports
CREATE POLICY "Users can create reports" ON public.reports
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = reporter_id);

-- RLS Policy: Users can read their own reports
CREATE POLICY "Users can read their own reports" ON public.reports
    FOR SELECT USING (auth.role() = 'authenticated' AND auth.uid() = reporter_id);

-- RLS Policy: Allow authenticated users to read all reports (for now - can be restricted later)
CREATE POLICY "Authenticated users can read reports" ON public.reports
    FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policy: Allow authenticated users to update reports (for admins)
CREATE POLICY "Authenticated users can update reports" ON public.reports
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT SELECT, INSERT ON public.reports TO anon;

-- Verify table was created successfully
SELECT 'Reports table created successfully!' as status;