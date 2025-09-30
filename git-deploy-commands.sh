#!/bin/bash
# Git deployment commands for presence system overhaul

echo "🚀 Deploying Presence System Overhaul..."

# Stage all changes
git add .

# Commit with comprehensive message
git commit -m "feat: comprehensive presence system overhaul and SQL cleanup

🧹 SQL Cleanup:
- Removed 28+ redundant SQL files
- Organized migrations in proper order
- Clean project structure

🔧 Presence System:
- Added heartbeat-based presence tracking
- Automatic cleanup of stale users (2min timeout)
- Session management for multi-tab support
- Browser close detection with sendBeacon

🔐 Admin Management:
- Easy admin user creation functions
- Admin promotion system
- Find users by email functionality

🚨 Emergency Tools:
- Emergency presence cleanup functions
- Debug statistics and monitoring
- Nuclear reset options for emergencies

📁 New Files:
- migrations/011_presence_cleanup_system.sql
- migrations/012_admin_management_functions.sql  
- migrations/013_emergency_presence_cleanup.sql
- src/services/supabase/presenceService.ts
- src/hooks/usePresenceManager.ts
- src/components/admin/PresenceCleanup.tsx
- CREATE_ADMIN_GUIDE.md
- IMMEDIATE_PRESENCE_FIX.md
- PRESENCE_ISSUE_ANALYSIS.md

⚠️  BREAKING CHANGES:
- Requires database migrations to be run
- Emergency cleanup needed for ghost users
- UserListSidebar integration still pending

🎯 Fixes Issue:
- Ghost users not disappearing from user list
- Users staying online after closing tabs
- No automatic presence cleanup"

# Push to main branch
git push origin main

echo "✅ Deployment complete!"
echo ""
echo "🔥 CRITICAL NEXT STEPS:"
echo "1. Run database migrations in Supabase SQL Editor"
echo "2. Run emergency cleanup: SELECT emergency_clear_all_presence();"
echo "3. Create admin user following CREATE_ADMIN_GUIDE.md"
echo "4. Test presence system functionality"