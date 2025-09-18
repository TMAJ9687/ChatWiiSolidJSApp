-- DEBUG: Let's see the exact relationship between tables

-- 1. Count the real numbers
SELECT
  'Real counts' as check_type,
  (SELECT COUNT(*) FROM auth.users) as total_auth_users,
  (SELECT COUNT(*) FROM users) as total_custom_users,
  (SELECT COUNT(*) FROM auth.users WHERE is_anonymous = true) as anonymous_auth_users,
  (SELECT COUNT(*) FROM auth.users WHERE is_anonymous = false) as registered_auth_users;

-- 2. Check if ALL auth users have custom entries
SELECT
  'Relationship check' as check_type,
  COUNT(*) as auth_users_total,
  COUNT(*) FILTER (WHERE id IN (SELECT id FROM users)) as auth_users_with_custom_match,
  COUNT(*) FILTER (WHERE id NOT IN (SELECT id FROM users)) as orphaned_auth_users
FROM auth.users;

-- 3. See what anonymous users look like
SELECT
  'Anonymous users breakdown' as check_type,
  COUNT(*) as total_anonymous,
  COUNT(*) FILTER (WHERE id IN (SELECT id FROM users)) as anonymous_with_custom_match,
  COUNT(*) FILTER (WHERE id NOT IN (SELECT id FROM users)) as orphaned_anonymous
FROM auth.users
WHERE is_anonymous = true;

-- 4. Check custom users roles
SELECT
  'Custom users roles' as check_type,
  role,
  COUNT(*) as count
FROM users
GROUP BY role;

-- 5. The key question: Are the custom users actually the SAME as anonymous users?
SELECT
  'Sample matched users' as sample_type,
  u.id,
  u.nickname,
  u.role,
  u.online,
  au.is_anonymous,
  au.email,
  au.last_sign_in_at
FROM users u
JOIN auth.users au ON u.id = au.id
WHERE au.is_anonymous = true
LIMIT 5;