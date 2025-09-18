-- Let's check both tables to see where the data actually is

-- Check your custom users table
SELECT
  'custom users table' as table_name,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE role = 'standard') as standard_users,
  COUNT(*) FILTER (WHERE role = 'admin') as admin_users,
  COUNT(*) FILTER (WHERE role = 'vip') as vip_users
FROM users;

-- Check Supabase auth.users table
SELECT
  'auth.users table' as table_name,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_anonymous = true) as anonymous_users,
  COUNT(*) FILTER (WHERE is_anonymous = false) as registered_users
FROM auth.users;

-- See if there are any users in auth.users with no email
SELECT COUNT(*) as auth_users_no_email FROM auth.users WHERE email IS NULL;

-- See if there's a relationship between the tables
SELECT
  'relationship check' as check_type,
  COUNT(DISTINCT u.id) as custom_table_users,
  COUNT(DISTINCT au.id) as auth_table_users,
  COUNT(DISTINCT u.id) FILTER (WHERE au.id IS NOT NULL) as matched_users
FROM users u
FULL OUTER JOIN auth.users au ON u.id = au.id;