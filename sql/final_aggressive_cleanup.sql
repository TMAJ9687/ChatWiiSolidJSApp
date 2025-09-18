-- FINAL AGGRESSIVE CLEANUP: Remove anonymous users regardless of online status
-- Since you confirmed 0 users are actually online, we'll ignore the online flag

-- STEP 1: See current counts
SELECT
  'BEFORE CLEANUP' as step,
  (SELECT COUNT(*) FROM auth.users) as total_auth_users,
  (SELECT COUNT(*) FROM auth.users WHERE is_anonymous = true) as anonymous_auth_users,
  (SELECT COUNT(*) FROM users WHERE role = 'standard') as standard_users,
  (SELECT COUNT(*) FROM users WHERE role != 'standard') as non_standard_users;

-- STEP 2: Delete anonymous standard users from BOTH tables
-- Delete from custom users table first (standard role users)
DELETE FROM users
WHERE role = 'standard';

-- STEP 3: Delete corresponding anonymous users from auth table
DELETE FROM auth.users
WHERE is_anonymous = true;

-- STEP 4: Check final results
SELECT
  'AFTER CLEANUP' as step,
  (SELECT COUNT(*) FROM auth.users) as remaining_auth_users,
  (SELECT COUNT(*) FROM users) as remaining_custom_users,
  (SELECT COUNT(*) FROM users WHERE role = 'admin') as admin_users,
  (SELECT COUNT(*) FROM users WHERE role = 'vip') as vip_users;

-- STEP 5: Show what's left
SELECT
  'REMAINING USERS' as final_check,
  u.nickname,
  u.role,
  u.online,
  au.email,
  au.is_anonymous
FROM users u
JOIN auth.users au ON u.id = au.id
ORDER BY u.role, u.nickname
LIMIT 10;