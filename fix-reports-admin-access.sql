-- Fix Reports Table Admin Access
-- Run this in your Supabase SQL Editor to fix admin access to reports

-- First, let's check if the reports table exists and see its structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'reports' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check existing policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'reports';

-- Drop existing conflicting policies if they exist (run one by one if needed)
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Users can read their own reports" ON public.reports;
DROP POLICY IF EXISTS "Authenticated users can read reports" ON public.reports;
DROP POLICY IF EXISTS "Authenticated users can update reports" ON public.reports;

-- Create proper RLS policies for reports table

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

-- Ensure RLS is enabled
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Verify the policies were created correctly
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'reports'
ORDER BY policyname;

-- Test query to see if admin can now see reports (replace with your admin user ID)
-- SELECT COUNT(*) as total_reports FROM public.reports;
-- SELECT status, COUNT(*) as count FROM public.reports GROUP BY status;

-- If you want to test with sample data (uncomment to run):
/*
-- Insert a test report (replace UUIDs with real user IDs from your users table)
INSERT INTO public.reports (reporter_id, reported_id, reason, description) 
VALUES (
    (SELECT id FROM public.users WHERE role != 'admin' LIMIT 1),
    (SELECT id FROM public.users WHERE role != 'admin' OFFSET 1 LIMIT 1), 
    'spam', 
    'Test report for admin viewing'
) ON CONFLICT DO NOTHING;
*/