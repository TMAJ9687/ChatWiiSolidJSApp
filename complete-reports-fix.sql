-- Complete Reports System Fix
-- Run this in your Supabase SQL Editor to fix all reports issues

-- Step 1: Check current reports table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'reports' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Add missing admin_notes column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reports' 
        AND column_name = 'admin_notes'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN admin_notes TEXT;
    END IF;
END $$;

-- Step 3: Ensure reports table exists with correct schema
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reported_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.reports(reporter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON public.reports(reported_id, created_at DESC);

-- Step 5: Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Users can read their own reports" ON public.reports;
DROP POLICY IF EXISTS "Authenticated users can read reports" ON public.reports;
DROP POLICY IF EXISTS "Authenticated users can update reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can read all reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can delete reports" ON public.reports;

-- Step 7: Create proper RLS policies

-- Policy 1: Users can create reports (only about other users, not themselves)
CREATE POLICY "Users can create reports" ON public.reports
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' 
        AND auth.uid() = reporter_id 
        AND auth.uid() != reported_id  -- Can't report yourself
    );

-- Policy 2: Users can read their own submitted reports
CREATE POLICY "Users can read their own reports" ON public.reports
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND auth.uid() = reporter_id
    );

-- Policy 3: CRITICAL - Admins can read ALL reports
CREATE POLICY "Admins can read all reports" ON public.reports
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy 4: Admins can update reports (change status, add notes)
CREATE POLICY "Admins can update reports" ON public.reports
    FOR UPDATE USING (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy 5: Admins can delete reports if needed
CREATE POLICY "Admins can delete reports" ON public.reports
    FOR DELETE USING (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Step 8: Add to realtime publication if not already added
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;

-- Step 9: Verify everything is set up correctly
SELECT 'Reports table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'reports' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Reports RLS policies:' as info;
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'reports'
ORDER BY policyname;

-- Step 10: Test data (uncomment to create test report)
/*
-- Insert a test report to verify admin can see it
INSERT INTO public.reports (
    reporter_id, 
    reported_id, 
    reason, 
    description,
    status
) 
SELECT 
    u1.id as reporter_id,
    u2.id as reported_id,
    'spam' as reason,
    'Test report for admin visibility check' as description,
    'pending' as status
FROM public.users u1, public.users u2 
WHERE u1.role != 'admin' 
AND u2.role != 'admin' 
AND u1.id != u2.id 
LIMIT 1
ON CONFLICT DO NOTHING;
*/

-- Final verification query for admins
SELECT 'Total reports count:' as info, COUNT(*) as count FROM public.reports;
SELECT 'Reports by status:' as info, status, COUNT(*) as count FROM public.reports GROUP BY status;