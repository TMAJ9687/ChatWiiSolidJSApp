-- Fix blocks table RLS policies - Final version
-- Run this in your Supabase SQL editor

-- First, check if the table exists and see current policies
SELECT schemaname, tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'blocks';

-- Drop all existing policies for blocks table (if they exist)
DO $$ 
BEGIN
    -- Drop policies if they exist
    DROP POLICY IF EXISTS "Allow authenticated users to read blocks" ON public.blocks;
    DROP POLICY IF EXISTS "Allow authenticated users to create blocks" ON public.blocks;
    DROP POLICY IF EXISTS "Allow authenticated users to delete their blocks" ON public.blocks;
    DROP POLICY IF EXISTS "Users can read all blocks" ON public.blocks;
    DROP POLICY IF EXISTS "Users can create blocks" ON public.blocks;
    DROP POLICY IF EXISTS "Users can delete blocks" ON public.blocks;
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.blocks;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.blocks;
    DROP POLICY IF EXISTS "Enable delete for users based on blocker_id" ON public.blocks;
    
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Some policies may not exist, continuing...';
END $$;

-- Now create the correct policies
CREATE POLICY "blocks_select_policy" ON public.blocks
    FOR SELECT USING (
        auth.uid() = blocker_id OR auth.uid() = blocked_id
    );

CREATE POLICY "blocks_insert_policy" ON public.blocks
    FOR INSERT WITH CHECK (
        auth.uid() = blocker_id
    );

CREATE POLICY "blocks_delete_policy" ON public.blocks
    FOR DELETE USING (
        auth.uid() = blocker_id
    );

-- Ensure RLS is enabled
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Check the final policies
SELECT schemaname, tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'blocks';