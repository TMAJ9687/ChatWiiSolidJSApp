# Anonymous User Cleanup System Setup

This guide will help you set up automatic cleanup of inactive anonymous users to reduce database costs.

## 🎯 What it does

- Automatically deletes anonymous users who haven't been active for **1 hour**
- Cleans up all associated data (messages, reports, blocks, presence, etc.)
- Provides admin dashboard controls for manual cleanup and monitoring
- Logs all cleanup operations for tracking
- **Never affects admin users or registered users**

## 📋 Setup Instructions

### Step 1: Run the SQL Setup Script

1. Go to your **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the entire contents of `cleanup-anonymous-users.sql`
3. **Execute the script** - this will create:
   - Database functions for cleanup operations
   - Logging table for tracking cleanup activity
   - Helper functions for statistics and safe operations

### Step 2: Enable pg_cron Extension (Optional but Recommended)

For automatic hourly cleanup:

1. Go to **Supabase Dashboard** → **Database** → **Extensions**
2. Find and **enable `pg_cron`**
3. Run this SQL command to start automatic cleanup:

```sql
-- Enable automatic cleanup every hour
SELECT cron.schedule(
    'cleanup-anonymous-users',
    '0 * * * *', -- Every hour at minute 0
    'SELECT cleanup_anonymous_users_with_logging();'
);
```

### Step 3: Test the System

Before enabling automatic cleanup, test it:

```sql
-- 1. Check current statistics
SELECT * FROM get_anonymous_user_stats();

-- 2. Run a safe dry run (doesn't delete anything)
SELECT * FROM safe_cleanup_anonymous_users(true);

-- 3. If you want to test actual cleanup:
SELECT * FROM safe_cleanup_anonymous_users(false);
```

### Step 4: Access Admin Controls

1. **Build and deploy** your updated application
2. **Login as admin** to your ChatWii app
3. Go to **Admin Panel** → **User Cleanup**
4. You'll see:
   - Real-time statistics of anonymous users
   - Manual cleanup controls
   - Activity logs
   - Automatic cleanup toggle

## 🎛️ Admin Dashboard Features

### Statistics Overview
- **Total Anonymous Users**: All anonymous users in database
- **Currently Active**: Users online right now
- **Inactive 1h+**: Users inactive for more than 1 hour
- **Ready for Cleanup**: Users that will be deleted in next cleanup

### Manual Controls
- **Dry Run**: Preview what would be deleted (safe)
- **Execute Cleanup**: Actually delete inactive users
- **Auto Cleanup Toggle**: Enable/disable automatic hourly cleanup

### Activity Monitoring
- View all cleanup operations with timestamps
- Track how many users were deleted
- Monitor system activity

## ⚠️ Important Notes

### Safety Features
- **Admin users are NEVER deleted** (protected by role check)
- **Only anonymous users** are affected (checked via Supabase auth)
- **Only inactive users** are deleted (1+ hour of inactivity)
- **Dry run option** lets you preview before deleting

### What Gets Deleted
When an anonymous user is cleaned up, ALL related data is removed:
- User profile and authentication record
- All messages sent/received
- All reports (made by or against the user)
- All blocks (made by or against the user) 
- Presence/online status
- Reactions to messages
- Typing indicators
- Photo usage tracking

### Cost Savings
- **Prevents database growth** from abandoned anonymous sessions
- **Reduces storage costs** by removing unused data
- **Improves performance** by keeping tables smaller
- **Maintains user experience** for active users

## 🔧 Manual Cleanup Commands

You can also run cleanup manually via SQL:

```sql
-- Get current stats
SELECT * FROM get_anonymous_user_stats();

-- Safe cleanup with logging
SELECT * FROM safe_cleanup_anonymous_users(false);

-- View cleanup logs
SELECT * FROM cleanup_logs ORDER BY executed_at DESC LIMIT 10;
```

## 📊 Monitoring

### Check Scheduled Jobs
```sql
-- View all cron jobs
SELECT * FROM cron.job;

-- Check specific cleanup job
SELECT * FROM cron.job WHERE jobname = 'cleanup-anonymous-users';
```

### View Recent Activity
```sql
-- Recent cleanup operations
SELECT 
    operation,
    users_affected,
    details,
    executed_at
FROM cleanup_logs 
ORDER BY executed_at DESC 
LIMIT 20;
```

## 🚨 Troubleshooting

### If Automatic Cleanup Isn't Working
1. Check if `pg_cron` extension is enabled
2. Verify the cron job is scheduled: `SELECT * FROM cron.job;`
3. Check for errors in cleanup logs
4. Ensure RLS policies allow function execution

### If Manual Cleanup Fails
1. Check admin permissions in your app
2. Verify database functions were created correctly
3. Test with dry run first: `SELECT * FROM safe_cleanup_anonymous_users(true);`

### Performance Considerations
- Cleanup runs efficiently with proper indexes
- Large cleanups might take a few seconds
- No impact on active users or chat functionality

## 🎉 You're Done!

Once set up, the system will:
- ✅ Automatically clean up inactive anonymous users every hour
- ✅ Provide admin visibility and controls
- ✅ Log all operations for tracking
- ✅ Keep your database lean and costs low
- ✅ Maintain excellent user experience

The admin can monitor and control everything from the **User Cleanup** panel in the admin dashboard.