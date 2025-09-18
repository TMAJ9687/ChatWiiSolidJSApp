-- DETAILED DIAGNOSTIC: Let's see the actual data to understand why nothing was deleted

-- 1. Check the actual role values in your custom table
SELECT
  'Custom table roles' as check_type,
  role,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE online = true) as online_count,
  COUNT(*) FILTER (WHERE online = false) as offline_count
FROM users
GROUP BY role
ORDER BY count DESC;

-- 2. Check the online status distribution
SELECT
  'Online status in custom table' as check_type,
  online,
  COUNT(*) as count
FROM users
GROUP BY online;

-- 3. Check auth table anonymous status
SELECT
  'Auth table anonymous status' as check_type,
  is_anonymous,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE email IS NULL) as no_email_count
FROM auth.users
GROUP BY is_anonymous;

-- 4. Check how many auth users are orphaned (not in custom table)
SELECT
  'Orphaned auth users' as check_type,
  COUNT(*) as total_auth_users,
  COUNT(*) FILTER (WHERE id NOT IN (SELECT id FROM users)) as orphaned_count,
  COUNT(*) FILTER (WHERE id IN (SELECT id FROM users)) as matched_count
FROM auth.users;

-- 5. Sample some actual users to see their data
SELECT
  'Sample custom users' as sample_type,
  id,
  nickname,
  role,
  online,
  last_seen,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 5;

-- 6. Sample auth users
SELECT
  'Sample auth users' as sample_type,
  id,
  email,
  is_anonymous,
  last_sign_in_at,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;