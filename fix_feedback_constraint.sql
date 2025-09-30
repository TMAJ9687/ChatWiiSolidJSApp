-- Quick fix for feedback status constraint issue
-- Run this in your Supabase SQL editor

-- First, check current constraint
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'feedback' 
    AND tc.constraint_type = 'CHECK';

-- Drop the existing constraint
ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS feedback_status_check;

-- Update any existing records with invalid status values
UPDATE public.feedback 
SET status = CASE 
    WHEN status = 'unread' THEN 'pending'
    WHEN status = 'replied' THEN 'resolved'
    WHEN status NOT IN ('pending', 'read', 'in_progress', 'resolved') THEN 'pending'
    ELSE status
END
WHERE status NOT IN ('pending', 'read', 'in_progress', 'resolved');

-- Add the correct constraint
ALTER TABLE public.feedback ADD CONSTRAINT feedback_status_check 
CHECK (status IN ('pending', 'read', 'in_progress', 'resolved'));

-- Verify the fix
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'feedback' 
    AND tc.constraint_type = 'CHECK';