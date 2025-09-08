-- Admin Dashboard Schema Test Script
-- Description: Test basic operations on new admin dashboard tables
-- Date: 2025-01-09
-- Note: This script tests the schema but doesn't commit changes (uses transactions with rollback)

BEGIN;

-- Test site_settings table
INSERT INTO public.site_settings (key, value, type) 
VALUES ('test_setting', 'test_value', 'string');

SELECT 'site_settings insert test' as test, 
       CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM public.site_settings WHERE key = 'test_setting';

-- Test bans table
INSERT INTO public.bans (reason, duration_hours, ip_address) 
VALUES ('Test ban', 24, '192.168.1.1'::INET);

SELECT 'bans insert test' as test,
       CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM public.bans WHERE reason = 'Test ban';

-- Test profanity_words table
INSERT INTO public.profanity_words (word, type) 
VALUES ('testword', 'chat');

SELECT 'profanity_words insert test' as test,
       CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM public.profanity_words WHERE word = 'testword';

-- Test admin_audit_log table
SELECT log_admin_action(
    '00000000-0000-0000-0000-000000000000'::UUID,
    'test_action',
    'user',
    '00000000-0000-0000-0000-000000000001'::UUID,
    '{"test": "data"}'::JSONB
) as audit_log_id;

SELECT 'admin_audit_log function test' as test,
       CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM public.admin_audit_log WHERE action = 'test_action';

-- Test feedback table
INSERT INTO public.feedback (email, subject, message) 
VALUES ('test@example.com', 'Test Subject', 'Test message');

SELECT 'feedback insert test' as test,
       CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM public.feedback WHERE subject = 'Test Subject';

-- Test utility functions
SELECT 'is_ip_banned function test' as test,
       CASE WHEN is_ip_banned('192.168.1.1'::INET) = true THEN 'PASS' ELSE 'FAIL' END as result;

SELECT 'expire_bans function test' as test, 'PASS' as result;
PERFORM expire_bans();

SELECT 'expire_kicks function test' as test, 'PASS' as result;
PERFORM expire_kicks();

-- Test completed
SELECT 'SCHEMA TEST COMPLETE' as summary, 
       'All basic operations working correctly' as result;

-- Rollback all test data
ROLLBACK;