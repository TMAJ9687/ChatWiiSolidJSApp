-- Fix blocks table RLS policies to prevent 406 errors
-- Run this in your Supabase SQL editor

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read blocks" ON public.blocks;
DROP POLICY IF EXISTS "Allow authenticated users to create blocks" ON public.blocks;
DROP POLICY IF EXISTS "Allow authenticated users to delete their blocks" ON public.blocks;

-- Create more permissive policies that work with anonymous auth
CREATE POLICY "Users can read all blocks" ON public.blocks
    FOR SELECT USING (true);

CREATE POLICY "Users can create blocks" ON public.blocks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete blocks" ON public.blocks
    FOR DELETE USING (true);

-- Ensure RLS is enabled
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Grant permissions for anonymous users
GRANT SELECT, INSERT, DELETE ON public.blocks TO anon;
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;