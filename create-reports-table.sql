-- Create reports table for user reporting system
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.reports (
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

-- Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_expires_at ON public.reports(expires_at);
CREATE INDEX IF NOT EXISTS idx_reports_reviewed ON public.reports(reviewed);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create reports" ON public.reports
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = reporter_id);

CREATE POLICY "Users can read their own reports" ON public.reports
    FOR SELECT USING (auth.role() = 'authenticated' AND auth.uid() = reporter_id);

CREATE POLICY "Admins can read all reports" ON public.reports
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can update reports" ON public.reports
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT SELECT, INSERT ON public.reports TO anon;

-- Function to automatically clean up expired reports (created after table exists)
CREATE OR REPLACE FUNCTION cleanup_expired_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.reports WHERE expires_at < NOW();
END;
$$;

-- Create a scheduled function (optional - for automatic cleanup)
-- You can run this manually or set up a cron job
-- SELECT cron.schedule('cleanup-reports', '0 2 * * *', 'SELECT cleanup_expired_reports();');