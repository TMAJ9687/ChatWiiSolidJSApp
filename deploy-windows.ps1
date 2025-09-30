# PowerShell deployment script for Windows
# Run this in PowerShell to deploy the presence system overhaul

Write-Host "🚀 Deploying Presence System Overhaul..." -ForegroundColor Green

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

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🔥 CRITICAL NEXT STEPS:" -ForegroundColor Red
Write-Host "1. Run database migrations in Supabase SQL Editor" -ForegroundColor Yellow
Write-Host "2. Run emergency cleanup: SELECT emergency_clear_all_presence();" -ForegroundColor Yellow
Write-Host "3. Create admin user following CREATE_ADMIN_GUIDE.md" -ForegroundColor Yellow
Write-Host "4. Test presence system functionality" -ForegroundColor Yellow