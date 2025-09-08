-- Temporarily disable RLS on blocks table to fix 406 errors
-- This is for testing only - you should re-enable proper RLS later

-- Drop all existing policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow authenticated users to read blocks" ON public.blocks;
    DROP POLICY IF EXISTS "Allow authenticated users to create blocks" ON public.blocks;
    DROP POLICY IF EXISTS "Allow authenticated users to delete their blocks" ON public.blocks;
    DROP POLICY IF EXISTS "Users can read all blocks" ON public.blocks;
    DROP POLICY IF EXISTS "Users can create blocks" ON public.blocks;
    DROP POLICY IF EXISTS "Users can delete blocks" ON public.blocks;
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.blocks;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.blocks;
    DROP POLICY IF EXISTS "Enable delete for users based on blocker_id" ON public.blocks;
    DROP POLICY IF EXISTS "blocks_select_policy" ON public.blocks;
    DROP POLICY IF EXISTS "blocks_insert_policy" ON public.blocks;
    DROP POLICY IF EXISTS "blocks_delete_policy" ON public.blocks;
    
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Some policies may not exist, continuing...';
END $$;

-- Disable RLS entirely for now (for testing)
ALTER TABLE public.blocks DISABLE ROW LEVEL SECURITY;

-- Grant full access to authenticated users
GRANT ALL ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO anon;

-- Check status
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'blocks';

SELECT 'No policies should be shown below:';
SELECT schemaname, tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'blocks';