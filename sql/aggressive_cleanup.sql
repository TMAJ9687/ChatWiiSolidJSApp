-- AGGRESSIVE CLEANUP: Remove ALL offline anonymous users
-- This will clean both your custom users table AND auth.users table

-- First, let's see what we're dealing with
SELECT
  'Current Status' as status,
  'Custom users table' as table_name,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE online = true) as online_users,
  COUNT(*) FILTER (WHERE online = false) as offline_users,
  COUNT(*) FILTER (WHERE online = false AND role = 'standard') as offline_standard_users
FROM users

UNION ALL

SELECT
  'Current Status' as status,
  'Auth users table' as table_name,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_anonymous = true) as anonymous_users,
  COUNT(*) FILTER (WHERE email IS NULL) as no_email_users,
  COUNT(*) FILTER (WHERE is_anonymous = true OR email IS NULL) as all_anonymous_users
FROM auth.users;

-- Now let's see which users would be deleted from each table
SELECT
  'Would Delete' as action,
  'Custom users table' as table_name,
  COUNT(*) as users_to_delete
FROM users
WHERE online = false
  AND role = 'standard'  -- Only standard users, not admin/vip
  AND last_seen < (now() - interval '1 hour')

UNION ALL

SELECT
  'Would Delete' as action,
  'Auth users table' as table_name,
  COUNT(*) as users_to_delete
FROM auth.users
WHERE (is_anonymous = true OR email IS NULL)
  AND (last_sign_in_at < (now() - interval '1 hour') OR last_sign_in_at IS NULL);

-- Check if there are any users with NULL last_seen/last_sign_in_at
SELECT
  'NULL Check' as check_type,
  'Custom table NULL last_seen' as description,
  COUNT(*) as count
FROM users
WHERE last_seen IS NULL AND online = false

UNION ALL

SELECT
  'NULL Check' as check_type,
  'Auth table NULL last_sign_in_at' as description,
  COUNT(*) as count
FROM auth.users
WHERE last_sign_in_at IS NULL;