-- Fix blocks table RLS policies for proper blocking functionality
-- Run this in your Supabase SQL Editor

-- Step 1: Check current blocks table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'blocks' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Ensure blocks table exists with correct schema
CREATE TABLE IF NOT EXISTS public.blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)  -- Prevent duplicate blocks
);

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON public.blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON public.blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocks_created_at ON public.blocks(created_at DESC);

-- Step 4: Enable RLS
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can manage their blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can create blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can read blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can delete blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can read their blocking relationships" ON public.blocks;
DROP POLICY IF EXISTS "Authenticated users can read blocks" ON public.blocks;

-- Step 6: Create proper RLS policies

-- Policy 1: Users can create blocks (block other users)
CREATE POLICY "Users can create blocks" ON public.blocks
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' 
        AND auth.uid() = blocker_id 
        AND auth.uid() != blocked_id  -- Can't block yourself
    );

-- Policy 2: Users can read blocks where they are involved (either as blocker or blocked)
CREATE POLICY "Users can read their blocking relationships" ON public.blocks
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND (auth.uid() = blocker_id OR auth.uid() = blocked_id)
    );

-- Policy 3: Users can delete their own blocks (unblock)
CREATE POLICY "Users can delete their blocks" ON public.blocks
    FOR DELETE USING (
        auth.role() = 'authenticated' 
        AND auth.uid() = blocker_id
    );

-- Step 7: Grant necessary permissions
GRANT ALL ON public.blocks TO authenticated;
GRANT USAGE ON SEQUENCE blocks_id_seq TO authenticated;

-- Step 8: Add to realtime publication if not already added
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocks;

-- Step 9: Verify everything is set up correctly
SELECT 'Blocks table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'blocks' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Blocks RLS policies:' as info;
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'blocks'
ORDER BY policyname;

-- Step 10: Test queries (run these to verify policies work)
-- These should work for authenticated users:

-- Test 1: Check if user can read their blocks
-- SELECT blocker_id, blocked_id FROM public.blocks WHERE blocker_id = auth.uid();

-- Test 2: Check if user can read blocks where they are blocked
-- SELECT blocker_id, blocked_id FROM public.blocks WHERE blocked_id = auth.uid();

-- Final verification
SELECT 'Blocks table is ready!' as status;