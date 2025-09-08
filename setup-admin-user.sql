-- Setup Admin User in Supabase
-- Run this in your Supabase SQL editor AFTER creating the admin user in Supabase Auth

-- First, you need to create the admin user in Supabase Auth dashboard:
-- 1. Go to Authentication > Users in your Supabase dashboard
-- 2. Click "Add User" 
-- 3. Enter email: admin@chatwii.com (or your preferred admin email)
-- 4. Enter a strong password
-- 5. Make sure "Auto Confirm User" is checked
-- 6. Click "Add User"
-- 7. Copy the User ID from the created user

-- Then run this SQL script, replacing 'YOUR_ADMIN_USER_ID' with the actual UUID from step 7:

-- Insert admin user profile
INSERT INTO public.users (
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
  '88e25581-7922-4f81-8241-07cb49964289'::UUID,
  'Admin',
  'male',
  30,
  'USA',
  'admin',
  'active',
  false,
  '/avatars/admin/admin.png',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  status = 'active',
  nickname = 'Admin';

-- Verify the admin user was created correctly
SELECT id, nickname, role, status, created_at 
FROM public.users 
WHERE role = 'admin';