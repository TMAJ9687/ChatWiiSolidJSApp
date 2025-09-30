-- Migration 012: Fix feedback status constraint
-- This migration ensures the feedback table has the correct status constraint

-- Drop the existing constraint if it exists
ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS feedback_status_check;

-- Add the correct constraint with the proper status values
ALTER TABLE public.feedback ADD CONSTRAINT feedback_status_check 
CHECK (status IN ('pending', 'read', 'in_progress', 'resolved'));

-- Update any existing records that might have invalid status values
-- First, let's update any potential old status values to new ones
UPDATE public.feedback 
SET status = CASE 
    WHEN status = 'unread' THEN 'pending'
    WHEN status = 'replied' THEN 'resolved'
    WHEN status NOT IN ('pending', 'read', 'in_progress', 'resolved') THEN 'pending'
    ELSE status
END
WHERE status NOT IN ('pending', 'read', 'in_progress', 'resolved');

-- Ensure default is correct
ALTER TABLE public.feedback ALTER COLUMN status SET DEFAULT 'pending';

-- Add a comment to document the constraint
COMMENT ON CONSTRAINT feedback_status_check ON public.feedback IS 
'Ensures feedback status is one of: pending, read, in_progress, resolved';