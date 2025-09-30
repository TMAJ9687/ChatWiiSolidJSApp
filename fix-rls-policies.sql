-- Fix RLS policies that are causing 406 errors
-- Run this in your Supabase SQL editor

-- Fix blocks table policies - make them more permissive for development
DROP POLICY IF EXISTS "Users can read their own blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can create blocks as blocker" ON public.blocks;
DROP POLICY IF EXISTS "Users can delete their own blocks" ON public.blocks;

-- Create more permissive blocks policies
CREATE POLICY "Allow authenticated users to read blocks" ON public.blocks
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create blocks" ON public.blocks
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = blocker_id);

CREATE POLICY "Allow authenticated users to delete their blocks" ON public.blocks
    FOR DELETE USING (auth.role() = 'authenticated' AND auth.uid() = blocker_id);

-- Fix photo_usage policies - make them more permissive
DROP POLICY IF EXISTS "Users can read their own photo usage" ON public.photo_usage;
DROP POLICY IF EXISTS "Users can manage their own photo usage" ON public.photo_usage;

-- Create more permissive photo usage policies
CREATE POLICY "Allow authenticated users to read photo usage" ON public.photo_usage
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage photo usage" ON public.photo_usage
    FOR ALL USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Ensure anonymous users can access what they need
-- Grant necessary permissions for anonymous auth
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;