-- Test script to verify reports table is set up correctly
-- Run this in your Supabase SQL editor to verify the setup

-- Check if reports table exists and has correct structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'reports' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if indexes exist
SELECT 
  indexname, 
  indexdef
FROM pg_indexes 
WHERE tablename = 'reports' 
AND schemaname = 'public';

-- Check if RLS is enabled
SELECT 
  tablename, 
  rowsecurity
FROM pg_tables 
WHERE tablename = 'reports' 
AND schemaname = 'public';

-- Check RLS policies
SELECT 
  policyname, 
  cmd, 
  roles,
  qual
FROM pg_policies 
WHERE tablename = 'reports' 
AND schemaname = 'public';

-- Test inserting a sample report (will fail if constraints are wrong)
-- Replace with actual user IDs from your users table
-- INSERT INTO public.reports (reporter_id, reported_id, reason) 
-- VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'spam');