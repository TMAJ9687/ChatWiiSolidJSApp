# 🚀 ChatWii Supabase Migration Guide

This guide will help you recreate your ChatWii database on a new Supabase project after the previous one was deleted due to policy violations.

## 📋 Prerequisites

1. **New Supabase Project**: Create a new project at [supabase.com](https://supabase.com)
2. **Access to SQL Editor**: You'll need to run SQL commands in the Supabase dashboard
3. **Environment Files**: Prepare to update your `.env` files

## 🗄️ Step 1: Database Setup

### Run the Complete Setup Script

1. Go to your **new Supabase project dashboard**
2. Navigate to **SQL Editor** in the left sidebar
3. Create a **new query**
4. Copy the entire contents of `COMPLETE_SUPABASE_SETUP.sql`
5. Paste it into the SQL Editor
6. Click **Run** to execute the script

⚠️ **Important**: The script is designed to run in one go. If you get any errors, check the error message and re-run the script.

### What This Script Creates:

#### Core Tables:
- ✅ `users` - User profiles and authentication data
- ✅ `messages` - Chat messages between users
- ✅ `reactions` - Message reactions (emojis)
- ✅ `blocks` - User blocking functionality
- ✅ `reports` - User reporting system
- ✅ `photo_usage` - Photo upload tracking and limits
- ✅ `presence` - Real-time user online/offline status
- ✅ `typing` - Typing indicators
- ✅ `feedback` - User feedback system

#### Admin Tables:
- ✅ `admin_logs` - Admin action logging
- ✅ `admin_sessions` - Admin login tracking
- ✅ `admin_settings` - Admin preferences
- ✅ `admin_announcements` - System announcements

#### Storage Buckets:
- ✅ `avatars` - User profile pictures
- ✅ `chat-images` - Photos shared in chats
- ✅ `voice-messages` - Voice message files

#### Security Features:
- ✅ Row Level Security (RLS) policies for all tables
- ✅ Proper authentication and authorization
- ✅ Admin-only access controls

## 🔧 Step 2: Update Environment Configuration

You need to update your environment files with the new Supabase project details.

### Find Your New Project Credentials

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy the following values:
   - **Project URL**
   - **Anon/Public Key**

### Update .env Files

Update the following files with your new credentials:

#### `.env` (main environment file)
```env
VITE_SUPABASE_URL=YOUR_NEW_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_NEW_ANON_KEY
```

#### `.env.local` (if it exists)
```env
VITE_SUPABASE_URL=YOUR_NEW_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_NEW_ANON_KEY
```

#### `.env.production` (if it exists)
```env
VITE_SUPABASE_URL=YOUR_NEW_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_NEW_ANON_KEY
```

## 👤 Step 3: Create Admin User (Optional)

If you need an admin user for testing:

1. Go to **Authentication** → **Users** in Supabase dashboard
2. Create a new user manually, or
3. Register through your application first
4. Then run this SQL to make them admin:

```sql
-- Replace 'USER_UUID_HERE' with the actual user ID
UPDATE public.users
SET role = 'admin'
WHERE id = 'USER_UUID_HERE';

-- Create admin settings for the user
INSERT INTO public.admin_settings (admin_id)
VALUES ('USER_UUID_HERE')
ON CONFLICT (admin_id) DO NOTHING;
```

## 🧪 Step 4: Test the Application

1. **Build and run your application**:
   ```bash
   npm run build
   npm run dev
   ```

2. **Test core functionality**:
   - ✅ User registration/login
   - ✅ Sending messages
   - ✅ Photo uploads
   - ✅ User blocking/unblocking
   - ✅ Admin functions (if applicable)

## 📝 Step 5: Verify Database Structure

Run this query in Supabase SQL Editor to verify all tables were created:

```sql
SELECT schemaname, tablename, tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

You should see these tables:
- admin_announcements
- admin_logs
- admin_sessions
- admin_settings
- blocks
- feedback
- messages
- photo_usage
- presence
- reactions
- reports
- typing
- users

## 🔐 Step 6: Configure Authentication (if needed)

1. Go to **Authentication** → **Settings** in Supabase
2. Configure your **Site URL** and **Redirect URLs**
3. Set up any **OAuth providers** you were using
4. Review **Email templates** and update if necessary

## 📊 Step 7: Storage Configuration

1. Go to **Storage** in Supabase dashboard
2. Verify the buckets were created:
   - `avatars` (public)
   - `chat-images` (public)
   - `voice-messages` (public)
3. Review storage policies if needed

## 🚨 Important Security Notes

### Photo Management
To prevent policy violations in the future, consider implementing:

1. **Automatic photo cleanup**:
   - Set up a scheduled function to delete old photos
   - Implement photo expiration (e.g., 30 days)

2. **Enhanced content moderation**:
   - Add image content scanning
   - Implement user reporting for inappropriate images
   - Add admin review queue for flagged content

3. **Storage limits**:
   - Implement per-user storage quotas
   - Monitor total storage usage

### Suggested Cleanup Function
Add this to your database for automatic photo cleanup:

```sql
-- Function to clean up old chat images (run monthly)
CREATE OR REPLACE FUNCTION cleanup_old_chat_images()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete chat images older than 30 days
    DELETE FROM storage.objects
    WHERE bucket_id = 'chat-images'
    AND created_at < NOW() - INTERVAL '30 days';

    -- Log the cleanup action
    INSERT INTO public.admin_logs (
        admin_id, admin_nickname, action, target_type, reason, details
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', -- System user
        'SYSTEM',
        'cleanup_old_images',
        'system',
        'Automatic cleanup of old chat images',
        jsonb_build_object('cleanup_date', NOW())
    );
END;
$$;
```

## 🎯 Migration Checklist

- [ ] ✅ New Supabase project created
- [ ] ✅ `COMPLETE_SUPABASE_SETUP.sql` executed successfully
- [ ] ✅ Environment variables updated
- [ ] ✅ Application builds without errors
- [ ] ✅ User registration/login works
- [ ] ✅ Messages send/receive correctly
- [ ] ✅ Photo uploads work
- [ ] ✅ Real-time features functional
- [ ] ✅ Admin panel accessible (if applicable)
- [ ] ✅ Storage policies working correctly
- [ ] ✅ Authentication flow complete

## 🆘 Troubleshooting

### Common Issues:

1. **RLS Policy Errors**:
   - Make sure users are properly authenticated
   - Check that user IDs match between auth and database

2. **Storage Upload Failures**:
   - Verify bucket policies are correct
   - Check file size limits in Supabase settings

3. **Real-time Not Working**:
   - Ensure tables are added to realtime publication
   - Check WebSocket connections in browser dev tools

4. **Admin Functions Not Working**:
   - Verify user has 'admin' role in users table
   - Check admin_settings table has entry for admin user

## 📞 Support

If you encounter issues during migration:

1. Check the browser console for detailed error messages
2. Review Supabase logs in the dashboard
3. Test individual SQL queries in the SQL Editor
4. Verify all environment variables are correct

---

**Your ChatWii database is now fully migrated and ready to use! 🎉**