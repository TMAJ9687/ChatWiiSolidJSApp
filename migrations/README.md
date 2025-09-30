# ChatWii Database Migrations

This directory contains all database migration scripts for the ChatWii application, including the Admin Dashboard and Presence System features.

## Migration Files (In Order)

### Core Migrations
1. **000_migration_tracking.sql** - Sets up migration tracking system
2. **001_admin_dashboard_schema.sql** - Creates new tables and adds columns to existing users table
3. **002_admin_dashboard_indexes.sql** - Creates performance indexes for all admin dashboard tables
4. **003_admin_dashboard_rls_policies.sql** - Sets up Row Level Security policies for admin access control
5. **004_admin_dashboard_functions.sql** - Creates utility functions for admin operations
6. **005_admin_dashboard_realtime.sql** - Enables realtime subscriptions for admin dashboard tables

### Enhanced Features
7. **006_admin_functions_clean.sql** - Clean admin transaction functions with proper parameter ordering
8. **007_add_version_columns.sql** - Version tracking columns for audit purposes
9. **008_audit_log_retention.sql** - Audit log cleanup and retention policies
10. **011_presence_cleanup_system.sql** - **🆕 Comprehensive presence cleanup system**

### Rollback Migrations
- **rollback/** directory contains rollback scripts for each migration
- **rollback_all.sql** - Complete rollback of all admin dashboard changes

## New Database Tables

### site_settings
Stores site-wide configuration settings like AdSense links, maintenance mode, and user limits.

### bans
Manages user and IP bans with duration, reason, and expiry tracking.

### bots
Stores bot user configurations including interests and behavior settings.

### profanity_words
Contains profanity filter words for both nicknames and chat messages.

### admin_audit_log
Logs all administrative actions for audit and compliance purposes.

### feedback
Stores user feedback submissions from the feedback page.

## New User Table Columns

- `kicked_at` - Timestamp when user was kicked
- `kick_reason` - Reason for kick action
- `ban_expires_at` - When the ban expires (NULL for permanent)
- `ban_reason` - Reason for ban
- `is_banned` - Boolean flag for ban status
- `is_kicked` - Boolean flag for kick status

## Utility Functions

- `expire_bans()` - Automatically expires bans that have reached their expiry time
- `expire_kicks()` - Automatically expires kicks after 24 hours
- `is_user_banned(UUID)` - Check if a user is currently banned
- `is_ip_banned(INET)` - Check if an IP address is currently banned
- `log_admin_action()` - Log administrative actions to audit trail

## Running Migrations

### Option 1: Run All Migrations
```sql
-- In Supabase SQL editor, run:
\i migrations/run_migrations.sql
```

### Option 2: Run Individual Migrations
Execute each migration file in order:
1. `001_admin_dashboard_schema.sql`
2. `002_admin_dashboard_indexes.sql`
3. `003_admin_dashboard_rls_policies.sql`
4. `004_admin_dashboard_functions.sql`
5. `005_admin_dashboard_realtime.sql`

## Rolling Back

### Complete Rollback
```sql
-- In Supabase SQL editor, run:
\i migrations/rollback_all.sql
```

### Individual Rollbacks
Run rollback scripts in reverse order:
1. `rollback/rollback_005_admin_dashboard_realtime.sql`
2. `rollback/rollback_004_admin_dashboard_functions.sql`
3. `rollback/rollback_003_admin_dashboard_rls_policies.sql`
4. `rollback/rollback_002_admin_dashboard_indexes.sql`
5. `rollback/rollback_001_admin_dashboard_schema.sql`

## Security Considerations

- All new tables have Row Level Security (RLS) enabled
- Only users with `role = 'admin'` can access admin dashboard tables
- Audit logging captures all administrative actions
- IP and user banning prevents unauthorized access

## Performance Optimizations

- Indexes created for frequently queried columns
- Partial indexes for boolean flags to improve performance
- Efficient queries for ban expiry and user status checks
- Realtime subscriptions optimized for admin dashboard needs

## Default Settings

The migration includes default site settings:
- AdSense links (3 empty slots)
- Maintenance mode (disabled)
- Max image uploads for standard users (10)
- VIP pricing tiers (monthly, quarterly, yearly)

## 🆕 Presence Cleanup System (Migration 011)

### Problem Solved
Users were not disappearing from the user list when they closed tabs or their browser crashed. This migration adds a comprehensive presence cleanup system.

### Key Features
- **Automatic user cleanup** when they close tabs or crash
- **Heartbeat system** to track active users (30-second intervals)
- **Stale user detection** (users marked offline after 2 minutes without heartbeat)
- **Session tracking** to prevent race conditions with multiple tabs
- **Scheduled cleanup** functions for maintenance
- **Real-time presence updates** with proper disconnect handling

### New Functions Added
- `update_user_heartbeat()` - Keep users marked as online with heartbeat
- `mark_user_offline()` - Properly mark users as offline with session checking
- `cleanup_stale_presence()` - Remove stale presence records automatically
- `get_active_users()` - Get active users with automatic cleanup
- `handle_user_disconnect()` - Handle proper disconnect cleanup
- `scheduled_presence_cleanup()` - Periodic maintenance cleanup

### Frontend Integration Required
1. Use `presenceService` for presence management
2. Use `usePresenceManager` hook in components
3. Ensure `/api/user-disconnect` endpoint is set up
4. Integrate heartbeat system in user components

## Cleaned Up Files

The following redundant migration files have been **removed**:
- ❌ `006_admin_transaction_functions.sql` (replaced by clean version)
- ❌ `006_admin_transaction_functions_fixed.sql` (replaced by clean version)
- ❌ `009_cleanup_rpc_functions.sql` (merged into 011)
- ❌ `010_missing_tables.sql` (tables already in main schema)
- ❌ `011_add_updated_at_column.sql` (redundant)
- ❌ `012_fix_feedback_status_constraint.sql` (redundant)
- ❌ `013_fix_uuid_casting_error.sql` (redundant)

## Verification

After running migrations, verify success by checking:
1. All tables exist: `\dt public.*`
2. All indexes exist: `\di public.*`
3. All functions exist: `\df public.*`
4. RLS policies are active: Check in Supabase dashboard
5. Default settings are inserted: `SELECT * FROM public.site_settings;`
6. **🆕 Presence functions work**: `SELECT cleanup_stale_presence();`
7. **🆕 Heartbeat system**: Test with `SELECT update_user_heartbeat('user-id');`

## Troubleshooting Presence Issues

### Users Not Disappearing from List
1. ✅ Check if migration 011 has been run: `SELECT * FROM presence LIMIT 1;`
2. ✅ Verify heartbeat system is working (check browser network tab)
3. ✅ Ensure `/api/user-disconnect` endpoint is accessible
4. ✅ Check if `scheduled_presence_cleanup()` is being called
5. ✅ Test manual cleanup: `SELECT cleanup_stale_presence();`

### Performance Issues
1. Monitor the presence table size: `SELECT COUNT(*) FROM presence;`
2. Check if indexes are being used: `EXPLAIN SELECT * FROM presence WHERE online = true;`
3. Adjust cleanup intervals if needed (default: 2 minutes for stale detection)