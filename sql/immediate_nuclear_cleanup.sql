-- NUCLEAR OPTION: Remove ALL offline anonymous users immediately
-- Run this if you want to clean up everything right now

-- STEP 1: Delete from custom users table (your chat users)
-- Only deletes offline standard users (preserves admin/vip)
DELETE FROM users
WHERE online = false
  AND role = 'standard';

-- See how many were deleted
SELECT 'Custom table cleanup' as result, ROW_COUNT() as deleted_count;

-- STEP 2: Delete from auth.users table (what you see in Authentication tab)
-- Only deletes anonymous users not in your active chat
DELETE FROM auth.users
WHERE id NOT IN (SELECT id FROM users)  -- Only orphaned users
  AND (is_anonymous = true OR email IS NULL);  -- Only anonymous

-- See how many were deleted
SELECT 'Auth table cleanup' as result, ROW_COUNT() as deleted_count;

-- STEP 3: Check final counts
SELECT
  'Final Count' as status,
  'Custom users' as table_name,
  COUNT(*) as remaining_users
FROM users

UNION ALL

SELECT
  'Final Count' as status,
  'Auth users' as table_name,
  COUNT(*) as remaining_users
FROM auth.users;