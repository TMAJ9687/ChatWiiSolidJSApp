-- WORKING CLEANUP: Remove anonymous users regardless of recent activity
-- Since you confirmed 0 users are actually online, we'll be more aggressive

-- STEP 1: Check what we're about to delete from auth.users
SELECT
  'BEFORE AUTH CLEANUP' as step,
  COUNT(*) as total_auth_users,
  COUNT(*) FILTER (WHERE is_anonymous = true) as anonymous_users,
  COUNT(*) FILTER (WHERE is_anonymous = true AND id NOT IN (SELECT id FROM users)) as orphaned_anonymous
FROM auth.users;

-- STEP 2: Delete orphaned anonymous users from auth.users (regardless of last_sign_in_at)
DELETE FROM auth.users
WHERE is_anonymous = true
  AND id NOT IN (SELECT id FROM users);  -- Only delete orphaned users

-- STEP 3: Check results
SELECT
  'AFTER AUTH CLEANUP' as step,
  COUNT(*) as remaining_auth_users,
  COUNT(*) FILTER (WHERE is_anonymous = true) as remaining_anonymous
FROM auth.users;

-- STEP 4: If you want to be even more aggressive, also clean custom table
-- This will delete offline users from your custom table too
SELECT
  'CUSTOM TABLE STATUS' as step,
  COUNT(*) as total_custom_users,
  COUNT(*) FILTER (WHERE online = false) as offline_users
FROM users;

-- Uncomment the next lines if you also want to clean the custom users table:
-- DELETE FROM users WHERE online = false AND role = 'standard';

-- STEP 5: Final summary
SELECT
  'FINAL SUMMARY' as result,
  'Auth users remaining' as description,
  COUNT(*) as count
FROM auth.users

UNION ALL

SELECT
  'FINAL SUMMARY' as result,
  'Custom users remaining' as description,
  COUNT(*) as count
FROM users;