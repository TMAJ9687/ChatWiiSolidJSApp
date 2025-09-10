-- Fix cleanup errors by ensuring tables exist and have proper permissions
-- Run this in your Supabase SQL editor

-- 1. Create reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  custom_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed BOOLEAN NOT NULL DEFAULT false,
  admin_notes TEXT
);

-- Create indexes for reports
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON public.reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created ON public.reports(created_at DESC);

-- Enable RLS for reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Service can manage reports" ON public.reports;

-- Allow users to create reports
CREATE POLICY "Users can create reports" ON public.reports
    FOR INSERT WITH CHECK (true);

-- Allow service role to manage reports (for cleanup)
CREATE POLICY "Service can manage reports" ON public.reports
    FOR ALL USING (true);

-- 2. Create blocks table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one block per user pair
  UNIQUE(blocker_id, blocked_id)
);

-- Create indexes for blocks
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON public.blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON public.blocks(blocked_id);

-- Enable RLS for blocks
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Users can manage blocks" ON public.blocks;
DROP POLICY IF EXISTS "Service can manage blocks" ON public.blocks;

-- Allow users to manage their own blocks
CREATE POLICY "Users can manage blocks" ON public.blocks
    FOR ALL USING (auth.uid() = blocker_id);

-- Allow service role to manage blocks (for cleanup)
CREATE POLICY "Service can manage blocks" ON public.blocks
    FOR ALL USING (true);

-- 3. Verify table structures
SELECT 'reports' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'reports' AND table_schema = 'public'

UNION ALL

SELECT 'blocks' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'blocks' AND table_schema = 'public'

ORDER BY table_name, column_name;