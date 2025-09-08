-- Complete blocks table setup - fixes 406 errors
-- Run this in your Supabase SQL editor

-- First, let's see the current structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'blocks'
ORDER BY ordinal_position;

-- Drop and recreate the table to ensure it's properly configured
DROP TABLE IF EXISTS public.blocks CASCADE;

-- Create blocks table with proper structure
CREATE TABLE public.blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure a user can't block the same person twice
    UNIQUE(blocker_id, blocked_id),
    
    -- Ensure a user can't block themselves
    CHECK (blocker_id != blocked_id)
);

-- Create indexes for better performance
CREATE INDEX idx_blocks_blocker_id ON public.blocks(blocker_id);
CREATE INDEX idx_blocks_blocked_id ON public.blocks(blocked_id);
CREATE INDEX idx_blocks_created_at ON public.blocks(created_at);

-- Enable realtime for the blocks table
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocks;

-- Disable RLS for now (we'll add proper policies later)
ALTER TABLE public.blocks DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO anon;
GRANT ALL ON public.blocks TO service_role;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_blocks_updated_at 
    BEFORE UPDATE ON public.blocks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify the table was created correctly
SELECT 'Table created successfully. Structure:';
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'blocks'
ORDER BY ordinal_position;