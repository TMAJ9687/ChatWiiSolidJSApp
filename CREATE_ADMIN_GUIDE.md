# 🔐 Admin User Creation Guide

## Quick Start - Make Yourself Admin

### Method 1: Using SQL Functions (Recommended)

1. **First, register normally** through your app to create an authenticated user

2. **Find your user ID** by running this in Supabase SQL Editor:
```sql
-- Replace 'your-email@example.com' with your actual email
SELECT * FROM find_user_by_email('your-email@example.com');
```

3. **Create admin profile** using the returned user ID:
```sql
-- Replace 'your-user-id-here' with the actual UUID from step 2
SELECT create_admin_user(
    'your-user-id-here',  -- Your auth user ID
    'Admin',              -- Your admin nickname
    'male',               -- Your gender (male/female)
    30,                   -- Your age
    'United States'       -- Your country
);
```

### Method 2: Direct SQL Insert

1. **Run the migration** first:
```sql
\i migrations/012_admin_management_functions.sql
```

2. **Use the create-admin-user.sql file**:
   - Open `create-admin-user.sql`
   - Replace `'YOUR_USER_ID_HERE'` with your actual user ID
   - Customize the profile information
   - Run the script in Supabase SQL Editor

### Method 3: Promote Existing User

If you already have a user profile:
```sql
-- Replace with your actual user ID
SELECT promote_to_admin('your-user-id-here');
```

## Finding Your User ID

### Option A: From Supabase Dashboard
1. Go to Supabase Dashboard → Authentication → Users
2. Find your email and copy the User UID

### Option B: Using SQL
```sql
-- Find by email
SELECT * FROM find_user_by_email('your-email@example.com');

-- Or list all auth users
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;
```

## Verify Admin Creation

```sql
-- Check if admin was created successfully
SELECT * FROM list_admin_users();

-- Or check specific user
SELECT id, nickname, role, status FROM users WHERE role = 'admin';
```

## Multiple Admins

To create additional admins:

```sql
-- Method 1: Create new admin (they must register first)
SELECT create_admin_user(
    'another-user-id',
    'Second Admin',
    'female',
    25,
    'Canada'
);

-- Method 2: Promote existing user (requires existing admin to do it)
SELECT promote_to_admin(
    'user-to-promote-id',
    'existing-admin-id'  -- Your admin ID
);
```

## Troubleshooting

### "Auth user not found"
- The user must register through your app first
- Check if the user ID exists: `SELECT * FROM auth.users WHERE id = 'your-id';`

### "User profile already exists"
- Use `promote_to_admin()` instead of `create_admin_user()`
- Or use the ON CONFLICT clause in the SQL

### "Permission denied"
- Make sure you're running the SQL as a service role or authenticated user
- Check if RLS policies are blocking the operation

### "Function does not exist"
- Run the migration first: `\i migrations/012_admin_management_functions.sql`

## Admin Features Unlocked

Once you're an admin, you'll have access to:

✅ **User Management** - Ban, kick, promote users  
✅ **Site Settings** - Configure app-wide settings  
✅ **Reports & Feedback** - Handle user reports  
✅ **Audit Logs** - View all admin actions  
✅ **Bot Management** - Create and manage bots  
✅ **Profanity Filter** - Manage blocked words  
✅ **Presence Management** - Monitor online users  

## Security Notes

- **Limit admin accounts** - Only create admins you trust
- **Monitor admin actions** - All actions are logged in `admin_logs`
- **Regular audits** - Review admin activity periodically
- **Secure credentials** - Use strong passwords for admin accounts

## Example Complete Flow

```sql
-- 1. Find your user (after registering through the app)
SELECT * FROM find_user_by_email('admin@chatwii.com');

-- 2. Create admin profile (use the ID from step 1)
SELECT create_admin_user(
    '12345678-1234-1234-1234-123456789012',
    'ChatWii Admin',
    'male',
    30,
    'United States'
);

-- 3. Verify it worked
SELECT * FROM list_admin_users();

-- 4. Check your admin settings were created
SELECT * FROM admin_settings WHERE admin_id = '12345678-1234-1234-1234-123456789012';
```

That's it! You should now have admin access to your ChatWii application. 🎉