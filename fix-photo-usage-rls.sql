-- Fix photo_usage RLS policies to allow anonymous users

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read photo usage" ON public.photo_usage;
DROP POLICY IF EXISTS "Allow authenticated users to manage photo usage" ON public.photo_usage;
DROP POLICY IF EXISTS "Users can read their own photo usage" ON public.photo_usage;
DROP POLICY IF EXISTS "Users can manage their own photo usage" ON public.photo_usage;

-- Create simple permissive policies for anonymous authentication
CREATE POLICY "Allow all operations on photo_usage for anonymous users" ON public.photo_usage
FOR ALL USING (true) WITH CHECK (true);

-- Alternative: If you want to be more restrictive, use this instead:
-- CREATE POLICY "Allow photo usage operations" ON public.photo_usage
-- FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');