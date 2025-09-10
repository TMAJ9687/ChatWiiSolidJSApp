-- Fix feedback table column names to match service expectations
-- Run this in your Supabase SQL editor

-- Check if the feedback table exists and what columns it has
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'feedback' AND table_schema = 'public'
ORDER BY ordinal_position;

-- If the table has 'feedback_text' column, rename it to 'message' to match service
DO $$ 
BEGIN
    -- Check if feedback_text column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'feedback' 
        AND table_schema = 'public' 
        AND column_name = 'feedback_text'
    ) THEN
        -- Rename feedback_text to message
        ALTER TABLE public.feedback RENAME COLUMN feedback_text TO message;
    END IF;
    
    -- Ensure we have a subject column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'feedback' 
        AND table_schema = 'public' 
        AND column_name = 'subject'
    ) THEN
        -- Add subject column if it doesn't exist
        ALTER TABLE public.feedback ADD COLUMN subject TEXT DEFAULT 'User Feedback';
    END IF;
END $$;

-- Verify the table structure after changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'feedback' AND table_schema = 'public'
ORDER BY ordinal_position;