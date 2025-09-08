-- Admin Dashboard Migration Verification Script
-- Description: Verify that all migrations have been applied successfully
-- Date: 2025-01-09

-- Check if all new tables exist
SELECT 
    'Tables Check' as check_type,
    CASE 
        WHEN COUNT(*) = 6 THEN 'PASS - All 6 tables created'
        ELSE 'FAIL - Missing tables: ' || (6 - COUNT(*))::text
    END as result
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('site_settings', 'bans', 'bots', 'profanity_words', 'admin_audit_log', 'feedback');

-- Check if new columns were added to users table
SELECT 
    'Users Table Columns' as check_type,
    CASE 
        WHEN COUNT(*) = 6 THEN 'PASS - All 6 columns added'
        ELSE 'FAIL - Missing columns: ' || (6 - COUNT(*))::text
    END as result
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
AND column_name IN ('kicked_at', 'kick_reason', 'ban_expires_at', 'ban_reason', 'is_banned', 'is_kicked');

-- Check if indexes were created
SELECT 
    'Indexes Check' as check_type,
    CASE 
        WHEN COUNT(*) >= 20 THEN 'PASS - Indexes created'
        ELSE 'FAIL - Missing indexes'
    END as result
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%admin%' OR indexname LIKE 'idx_%ban%' OR indexname LIKE 'idx_%bot%' OR indexname LIKE 'idx_%profanity%' OR indexname LIKE 'idx_%feedback%' OR indexname LIKE 'idx_%site_settings%';

-- Check if functions were created
SELECT 
    'Functions Check' as check_type,
    CASE 
        WHEN COUNT(*) >= 6 THEN 'PASS - Functions created'
        ELSE 'FAIL - Missing functions'
    END as result
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('expire_bans', 'expire_kicks', 'is_user_banned', 'is_ip_banned', 'log_admin_action', 'update_site_settings_updated_at');

-- Check if RLS is enabled on new tables
SELECT 
    'RLS Check' as check_type,
    CASE 
        WHEN COUNT(*) = 6 THEN 'PASS - RLS enabled on all tables'
        ELSE 'FAIL - RLS not enabled on all tables'
    END as result
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname IN ('site_settings', 'bans', 'bots', 'profanity_words', 'admin_audit_log', 'feedback')
AND c.relrowsecurity = true;

-- Check if default settings were inserted
SELECT 
    'Default Settings Check' as check_type,
    CASE 
        WHEN COUNT(*) >= 8 THEN 'PASS - Default settings inserted'
        ELSE 'FAIL - Missing default settings'
    END as result
FROM public.site_settings
WHERE key IN ('adsense_link_1', 'adsense_link_2', 'adsense_link_3', 'maintenance_mode', 'max_image_uploads_standard', 'vip_price_monthly', 'vip_price_quarterly', 'vip_price_yearly');

-- Test utility functions
SELECT 
    'Function Test' as check_type,
    CASE 
        WHEN is_user_banned('00000000-0000-0000-0000-000000000000'::UUID) = false THEN 'PASS - Functions working'
        ELSE 'FAIL - Function error'
    END as result;

-- Summary
SELECT 
    'MIGRATION VERIFICATION COMPLETE' as summary,
    'Check all results above - all should show PASS' as instruction;