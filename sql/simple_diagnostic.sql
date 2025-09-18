-- Simple diagnostic - let's see the current state

-- 1. Custom users table status
SELECT
  COUNT(*) as total_custom_users,
  COUNT(*) FILTER (WHERE online = true) as online_users,
  COUNT(*) FILTER (WHERE online = false) as offline_users,
  COUNT(*) FILTER (WHERE role = 'standard') as standard_users,
  COUNT(*) FILTER (WHERE role = 'admin') as admin_users,
  COUNT(*) FILTER (WHERE role = 'vip') as vip_users
FROM users;

-- 2. Auth users table status
SELECT
  COUNT(*) as total_auth_users,
  COUNT(*) FILTER (WHERE is_anonymous = true) as truly_anonymous,
  COUNT(*) FILTER (WHERE email IS NULL) as no_email,
  COUNT(*) FILTER (WHERE is_anonymous = true OR email IS NULL) as all_anonymous
FROM auth.users;

-- 3. What would be deleted from custom table
SELECT
  'Custom table cleanup' as cleanup_target,
  COUNT(*) as would_delete
FROM users
WHERE online = false
  AND role = 'standard'
  AND last_seen < (now() - interval '1 hour');

-- 4. What would be deleted from auth table
SELECT
  'Auth table cleanup' as cleanup_target,
  COUNT(*) as would_delete
FROM auth.users
WHERE (is_anonymous = true OR email IS NULL)
  AND (last_sign_in_at < (now() - interval '1 hour') OR last_sign_in_at IS NULL);