-- FIXED NUCLEAR CLEANUP: Remove ALL offline anonymous users
-- This will actually work and show results

-- STEP 1: Count what we'll delete from custom table
SELECT
  'BEFORE CUSTOM CLEANUP' as step,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE online = false AND role = 'standard') as will_delete
FROM users;

-- STEP 2: Delete from custom users table
DELETE FROM users
WHERE online = false
  AND role = 'standard';

-- STEP 3: Count what's left in custom table
SELECT
  'AFTER CUSTOM CLEANUP' as step,
  COUNT(*) as remaining_users
FROM users;

-- STEP 4: Count what we'll delete from auth table
SELECT
  'BEFORE AUTH CLEANUP' as step,
  COUNT(*) as total_auth_users,
  COUNT(*) FILTER (WHERE id NOT IN (SELECT id FROM users) AND (is_anonymous = true OR email IS NULL)) as will_delete
FROM auth.users;

-- STEP 5: Delete from auth.users table
DELETE FROM auth.users
WHERE id NOT IN (SELECT id FROM users)
  AND (is_anonymous = true OR email IS NULL);

-- STEP 6: Final counts
SELECT
  'FINAL RESULTS' as step,
  COUNT(*) as remaining_auth_users
FROM auth.users;

-- STEP 7: Summary
SELECT
  'SUMMARY' as result,
  'Custom users remaining' as table_name,
  COUNT(*) as count
FROM users

UNION ALL

SELECT
  'SUMMARY' as result,
  'Auth users remaining' as table_name,
  COUNT(*) as count
FROM auth.users;