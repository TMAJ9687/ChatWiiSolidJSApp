# Supabase Setup Guide

This guide will help you set up your Supabase project for the ChatWii application.

## 1. Database Setup

First, run the SQL setup script in your Supabase dashboard:

1. Go to https://supabase.com/dashboard/project/rszooxlscexevcxpefmf/sql/new
2. Copy the contents of `supabase-setup.sql` and paste it into the SQL editor
3. Click "Run" to create all tables and policies

## 2. Enable Realtime Features

For real-time messaging, typing indicators, and presence to work, you need to enable Realtime for your tables:

1. Go to https://supabase.com/dashboard/project/rszooxlscexevcxpefmf/database/tables
2. For each of these tables, click on the table name and enable Realtime:
   - **messages** ✅ (Required for instant messaging)
   - **presence** ✅ (Required for online status)
   - **typing** ✅ (Required for typing indicators)
   - **users** ✅ (Required for user updates)
   - **blocks** (Optional)
   - **reactions** (Optional)

### How to Enable Realtime:
1. Click on a table name
2. Click the "Settings" tab
3. Toggle "Enable Realtime" to ON
4. Click "Save"

## 3. Authentication Settings

1. Go to https://supabase.com/dashboard/project/rszooxlscexevcxpefmf/auth/settings
2. Under "Auth Settings":
   - Enable "Allow anonymous sign-ins" ✅
   - Set "Site URL" to `http://localhost:3003` (for development)
   - Add `http://localhost:3003` to "Redirect URLs"

## 4. Storage Setup (for image uploads)

1. Go to https://supabase.com/dashboard/project/rszooxlscexevcxpefmf/storage/buckets
2. Verify the `chat-images` bucket exists (it should be created by the SQL script)
3. If it doesn't exist, create it with public access

## 5. Row Level Security (RLS)

RLS policies are automatically created by the SQL script. Verify they're active:

1. Go to https://supabase.com/dashboard/project/rszooxlscexevcxpefmf/auth/policies
2. Each table should have policies that allow:
   - Users to read/write their own data
   - Anonymous users to interact appropriately

## 6. Test Connection

After setup, restart your development server:
```bash
npm run dev
```

The app should now work with:
- ✅ Real-time messaging
- ✅ Typing indicators  
- ✅ Online presence
- ✅ Anonymous authentication
- ✅ Image uploads

## Troubleshooting

If you encounter issues:

1. **Database connection errors**: Check your environment variables
2. **Realtime not working**: Ensure Realtime is enabled for all required tables
3. **Authentication issues**: Verify anonymous sign-ins are enabled
4. **Image upload failures**: Check storage bucket permissions

For more help, check the Supabase documentation at https://supabase.com/docs