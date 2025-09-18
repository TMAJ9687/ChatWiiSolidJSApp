-- IMMEDIATE CLEANUP: Run this after the setup SQL above
-- This will immediately remove anonymous users offline for 1+ hours

-- First, let's see what we have:
SELECT
  'Current anonymous users' as description,
  COUNT(*) as count
FROM users
WHERE role = 'user'
  AND (email IS NULL OR email = '');

-- See how many are offline for 1+ hours:
SELECT
  'Anonymous users offline 1+ hours' as description,
  COUNT(*) as count
FROM users
WHERE role = 'user'
  AND online = false
  AND last_seen < (now() - interval '1 hour')
  AND (email IS NULL OR email = '');

-- EXECUTE THE CLEANUP (uncomment the line below when ready):
-- SELECT * FROM safe_cleanup_anonymous_users(false);

-- To run the cleanup, copy and run this line:
-- SELECT * FROM safe_cleanup_anonymous_users(false);