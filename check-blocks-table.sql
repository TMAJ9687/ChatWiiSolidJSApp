-- Check if blocks table exists and its structure
-- Run this in your Supabase SQL editor

-- Check if table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'blocks'
) as table_exists;

-- If table exists, show its structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'blocks'
ORDER BY ordinal_position;

-- Check if there are any existing records
SELECT COUNT(*) as record_count FROM public.blocks;

-- Show any existing policies (should be none after our previous script)
SELECT schemaname, tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'blocks';

-- Check table permissions
SELECT 
    grantee, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'blocks';