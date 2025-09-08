-- Cleanup script for deleted/invalid users
-- Run this in your Supabase SQL Editor

-- First, let's see what users might be problematic
SELECT id, nickname, role, status, created_at, online
FROM public.users
WHERE nickname IS NULL OR nickname = '' OR LENGTH(TRIM(nickname)) = 0
ORDER BY created_at DESC;

-- Check for users with foreign key references that might prevent deletion
SELECT 
    u.id,
    u.nickname,
    u.status,
    (SELECT COUNT(*) FROM public.messages m WHERE m.sender_id = u.id OR m.receiver_id = u.id) as message_count,
    (SELECT COUNT(*) FROM public.presence p WHERE p.user_id = u.id) as presence_count,
    (SELECT COUNT(*) FROM public.blocks b WHERE b.blocker_id = u.id OR b.blocked_id = u.id) as blocks_count
FROM public.users u
WHERE u.nickname IS NULL OR u.nickname = '' OR LENGTH(TRIM(u.nickname)) = 0;

-- Clean up invalid users and their references
-- WARNING: This will permanently delete data!

/*
-- Delete messages from/to invalid users
DELETE FROM public.messages 
WHERE sender_id IN (
    SELECT id FROM public.users 
    WHERE nickname IS NULL OR nickname = '' OR LENGTH(TRIM(nickname)) = 0
) OR receiver_id IN (
    SELECT id FROM public.users 
    WHERE nickname IS NULL OR nickname = '' OR LENGTH(TRIM(nickname)) = 0
);

-- Delete presence records for invalid users
DELETE FROM public.presence 
WHERE user_id IN (
    SELECT id FROM public.users 
    WHERE nickname IS NULL OR nickname = '' OR LENGTH(TRIM(nickname)) = 0
);

-- Delete blocks involving invalid users
DELETE FROM public.blocks 
WHERE blocker_id IN (
    SELECT id FROM public.users 
    WHERE nickname IS NULL OR nickname = '' OR LENGTH(TRIM(nickname)) = 0
) OR blocked_id IN (
    SELECT id FROM public.users 
    WHERE nickname IS NULL OR nickname = '' OR LENGTH(TRIM(nickname)) = 0
);

-- Delete typing records for invalid users
DELETE FROM public.typing 
WHERE user_id IN (
    SELECT id FROM public.users 
    WHERE nickname IS NULL OR nickname = '' OR LENGTH(TRIM(nickname)) = 0
);

-- Delete reactions from invalid users
DELETE FROM public.reactions 
WHERE user_id IN (
    SELECT id FROM public.users 
    WHERE nickname IS NULL OR nickname = '' OR LENGTH(TRIM(nickname)) = 0
);

-- Delete reports involving invalid users
DELETE FROM public.reports 
WHERE reporter_id IN (
    SELECT id FROM public.users 
    WHERE nickname IS NULL OR nickname = '' OR LENGTH(TRIM(nickname)) = 0
) OR reported_id IN (
    SELECT id FROM public.users 
    WHERE nickname IS NULL OR nickname = '' OR LENGTH(TRIM(nickname)) = 0
);

-- Finally, delete the invalid users themselves
DELETE FROM public.users 
WHERE nickname IS NULL OR nickname = '' OR LENGTH(TRIM(nickname)) = 0;

-- Verify cleanup
SELECT COUNT(*) as remaining_invalid_users
FROM public.users 
WHERE nickname IS NULL OR nickname = '' OR LENGTH(TRIM(nickname)) = 0;
*/