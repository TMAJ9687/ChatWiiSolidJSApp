# Admin Dashboard Database Migrations

This directory contains the database migration scripts for the Admin Dashboard Overhaul feature.

## Migration Files

### Forward Migrations
1. **001_admin_dashboard_schema.sql** - Creates new tables and adds columns to existing users table
2. **002_admin_dashboard_indexes.sql** - Creates performance indexes for all admin dashboard tables
3. **003_admin_dashboard_rls_policies.sql** - Sets up Row Level Security policies for admin access control
4. **004_admin_dashboard_functions.sql** - Creates utility functions for admin operations
5. **005_admin_dashboard_realtime.sql** - Enables realtime subscriptions for admin dashboard tables

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

## Verification

After running migrations, verify success by checking:
1. All tables exist: `\dt public.*`
2. All indexes exist: `\di public.*`
3. All functions exist: `\df public.*`
4. RLS policies are active: Check in Supabase dashboard
5. Default settings are inserted: `SELECT * FROM public.site_settings;`