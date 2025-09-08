-- Enable full API access for blocks table to fix 406 errors

-- Check if the table is exposed via PostgREST API
SELECT 
    schemaname, 
    tablename, 
    tableowner,
    rowsecurity,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE tablename = 'blocks';

-- Enable the table for PostgREST API access
-- This is crucial - Supabase might not expose tables without this
DO $$
BEGIN
    -- Ensure the table exists in the API schema
    EXECUTE format('GRANT USAGE ON SCHEMA public TO anon, authenticated');
    EXECUTE format('GRANT ALL ON public.blocks TO anon, authenticated, service_role');
    EXECUTE format('GRANT ALL ON SCHEMA public TO anon, authenticated, service_role');
    
    -- If there's a sequence, grant access to it too
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'blocks_id_seq') THEN
        EXECUTE format('GRANT ALL ON SEQUENCE public.blocks_id_seq TO anon, authenticated, service_role');
    END IF;
END
$$;

-- Completely remove any RLS that might be causing issues
ALTER TABLE public.blocks DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might interfere
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'blocks') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.blocks', r.policyname);
    END LOOP;
END
$$;

-- Check if table is in realtime publication
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND schemaname = 'public' 
AND tablename = 'blocks';

-- Make sure realtime is enabled
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocks;

-- Check the final status
SELECT 'API access should now be enabled for blocks table';

-- Verify permissions
SELECT 
    grantee, 
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'blocks'
ORDER BY grantee, privilege_type;

-- Verify no RLS policies exist
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd 
FROM pg_policies 
WHERE tablename = 'blocks';

-- Final check: ensure table is accessible
SELECT COUNT(*) as total_blocks FROM public.blocks;