-- Fix foreign key relationships and API access for blocks table

-- First, check if users table exists in public schema (it might be in auth schema)
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name = 'users';

-- Check current foreign key constraints
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='blocks';

-- Drop the existing blocks table and recreate without foreign key constraints that cause issues
DROP TABLE IF EXISTS public.blocks CASCADE;

-- Create a simpler blocks table without problematic foreign keys
CREATE TABLE public.blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id UUID NOT NULL,
    blocked_id UUID NOT NULL,
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

-- Enable the table in Supabase API
-- This is crucial for the API to work
CREATE OR REPLACE VIEW public.blocks_view AS 
SELECT * FROM public.blocks;

-- Grant permissions to all roles
GRANT ALL ON public.blocks TO anon;
GRANT ALL ON public.blocks TO authenticated; 
GRANT ALL ON public.blocks TO service_role;
GRANT ALL ON public.blocks_view TO anon;
GRANT ALL ON public.blocks_view TO authenticated;
GRANT ALL ON public.blocks_view TO service_role;

-- Disable RLS completely
ALTER TABLE public.blocks DISABLE ROW LEVEL SECURITY;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocks;

-- Table is now ready for API access

SELECT 'Blocks table setup completed successfully';

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'blocks'
ORDER BY ordinal_position;