-- =====================================================
-- ADMIN USER CREATION SCRIPT
-- =====================================================
-- This script helps you create admin users from existing authenticated users
-- 
-- INSTRUCTIONS:
-- 1. First, create a user account through your app's normal registration
-- 2. Find the user ID in Supabase Auth dashboard or run: SELECT * FROM auth.users;
-- 3. Replace the USER_ID below with the actual UUID
-- 4. Customize the profile information
-- 5. Run this script in Supabase SQL Editor
-- =====================================================

-- Method 1: Create admin profile for existing auth user
-- Replace 'YOUR_USER_ID_HERE' with the actual UUID from auth.users
INSERT INTO users (
  id,
  nickname,
  gender,
  age,
  country,
  role,
  status,
  online,
  avatar,
  created_at
) VALUES (
  'd23e7e77-5f29-41b3-94f2-30f57938ad0d',                     -- ⚠️  REPLACE WITH ACTUAL USER ID
  'Admin',                                  -- Choose a nickname
  'male',                                   -- Choose gender (male/female)
  30,                                       -- Choose age (18-120)
  'United States',                          -- Choose country
  'admin',                                  -- This makes them admin
  'active',                                 -- Active status
  false,                                    -- Initially offline
  '',                                       -- Avatar (empty for default)
  NOW()                                     -- Created timestamp
) ON CONFLICT (id) DO UPDATE SET
  role = 'admin',                          -- Update existing user to admin
  status = 'active';                       -- Ensure they're active

-- Method 2: Upgrade existing user to admin (if they already have a profile)
-- Uncomment and replace USER_ID to upgrade existing user
/*
UPDATE users 
SET role = 'admin', status = 'active' 
WHERE id = 'YOUR_USER_ID_HERE';
*/

-- Method 3: Find users by email to get their ID
-- Uncomment and replace email to find user ID
/*
SELECT 
  au.id as auth_id,
  au.email,
  u.id as user_profile_id,
  u.nickname,
  u.role,
  u.status
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE au.email = 'your-email@example.com';
*/

-- Verify admin user was created/updated
SELECT 
  id,
  nickname,
  role,
  status,
  created_at
FROM users 
WHERE role = 'admin'
ORDER BY created_at DESC;