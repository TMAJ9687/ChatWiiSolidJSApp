-- Anonymous Users Cleanup System
-- This script creates automatic cleanup for inactive anonymous users after 1 hour

-- Step 1: Create function to identify and cleanup inactive anonymous users
CREATE OR REPLACE FUNCTION cleanup_inactive_anonymous_users()
RETURNS TABLE(deleted_count bigint, cleanup_summary text) AS $$
DECLARE
    users_to_delete UUID[];
    deleted_users_count bigint := 0;
    one_hour_ago timestamptz;
BEGIN
    -- Set the cutoff time (1 hour ago)
    one_hour_ago := NOW() - INTERVAL '1 hour';
    
    -- Find anonymous users who haven't been active for more than 1 hour
    -- Anonymous users in Supabase have email as NULL and are_anonymous = true
    SELECT ARRAY_AGG(u.id)
    INTO users_to_delete
    FROM auth.users au
    JOIN public.users u ON au.id = u.id
    WHERE au.email IS NULL  -- Anonymous users have no email
    AND au.is_anonymous = true  -- Explicitly anonymous
    AND u.role = 'standard'  -- Don't touch admin users
    AND (u.last_seen IS NULL OR u.last_seen < one_hour_ago)  -- Inactive for 1+ hours
    AND (u.online = false OR u.online IS NULL);  -- Not currently online

    -- If we found users to delete
    IF users_to_delete IS NOT NULL AND array_length(users_to_delete, 1) > 0 THEN
        -- Delete from related tables first (foreign key constraints)
        DELETE FROM public.presence WHERE user_id = ANY(users_to_delete);
        DELETE FROM public.blocks WHERE blocker_id = ANY(users_to_delete) OR blocked_id = ANY(users_to_delete);
        DELETE FROM public.reports WHERE reporter_id = ANY(users_to_delete) OR reported_id = ANY(users_to_delete);
        DELETE FROM public.messages WHERE sender_id = ANY(users_to_delete) OR receiver_id = ANY(users_to_delete);
        DELETE FROM public.reactions WHERE user_id = ANY(users_to_delete);
        DELETE FROM public.typing WHERE user_id = ANY(users_to_delete);
        DELETE FROM public.photo_usage WHERE user_id = ANY(users_to_delete);
        
        -- Delete from public.users table
        DELETE FROM public.users WHERE id = ANY(users_to_delete);
        
        -- Delete from auth.users (this removes the authentication record)
        DELETE FROM auth.users WHERE id = ANY(users_to_delete);
        
        deleted_users_count := array_length(users_to_delete, 1);
    END IF;

    RETURN QUERY SELECT 
        deleted_users_count as deleted_count,
        format('Cleaned up %s inactive anonymous users older than %s', 
               deleted_users_count, 
               one_hour_ago::text) as cleanup_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create a more conservative function that only marks users for deletion
-- (In case you want to test first or have a two-step process)
CREATE OR REPLACE FUNCTION mark_inactive_anonymous_users_for_deletion()
RETURNS TABLE(marked_count bigint, marked_user_ids text[]) AS $$
DECLARE
    users_to_mark UUID[];
    one_hour_ago timestamptz;
BEGIN
    one_hour_ago := NOW() - INTERVAL '1 hour';
    
    -- Find inactive anonymous users
    SELECT ARRAY_AGG(u.id)
    INTO users_to_mark
    FROM auth.users au
    JOIN public.users u ON au.id = u.id
    WHERE au.email IS NULL
    AND au.is_anonymous = true
    AND u.role = 'standard'
    AND (u.last_seen IS NULL OR u.last_seen < one_hour_ago)
    AND (u.online = false OR u.online IS NULL)
    AND u.status = 'active';  -- Only mark active users
    
    -- Mark them with a special status instead of deleting
    IF users_to_mark IS NOT NULL AND array_length(users_to_mark, 1) > 0 THEN
        UPDATE public.users 
        SET status = 'inactive_cleanup', 
            online = false,
            last_seen = NOW()
        WHERE id = ANY(users_to_mark);
        
        -- Also remove from presence
        DELETE FROM public.presence WHERE user_id = ANY(users_to_mark);
    END IF;

    RETURN QUERY SELECT 
        COALESCE(array_length(users_to_mark, 1), 0)::bigint as marked_count,
        ARRAY(SELECT u.id::text FROM unnest(COALESCE(users_to_mark, ARRAY[]::UUID[])) u(id)) as marked_user_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create function to get cleanup statistics
CREATE OR REPLACE FUNCTION get_anonymous_user_stats()
RETURNS TABLE(
    total_anonymous_users bigint,
    active_anonymous_users bigint,
    inactive_for_1h_plus bigint,
    ready_for_cleanup bigint
) AS $$
DECLARE
    one_hour_ago timestamptz := NOW() - INTERVAL '1 hour';
BEGIN
    RETURN QUERY
    WITH anonymous_users AS (
        SELECT u.*, au.is_anonymous, au.email
        FROM public.users u
        JOIN auth.users au ON u.id = au.id
        WHERE au.email IS NULL AND au.is_anonymous = true AND u.role = 'standard'
    )
    SELECT 
        COUNT(*)::bigint as total_anonymous_users,
        COUNT(*) FILTER (WHERE online = true)::bigint as active_anonymous_users,
        COUNT(*) FILTER (WHERE last_seen < one_hour_ago OR last_seen IS NULL)::bigint as inactive_for_1h_plus,
        COUNT(*) FILTER (WHERE (online = false OR online IS NULL) 
                        AND (last_seen < one_hour_ago OR last_seen IS NULL))::bigint as ready_for_cleanup
    FROM anonymous_users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create a safe cleanup function that logs what it's doing
CREATE OR REPLACE FUNCTION safe_cleanup_anonymous_users(dry_run boolean DEFAULT true)
RETURNS TABLE(
    action text,
    count bigint,
    details text
) AS $$
DECLARE
    users_to_delete UUID[];
    deleted_count bigint := 0;
    one_hour_ago timestamptz := NOW() - INTERVAL '1 hour';
    log_entry text;
BEGIN
    -- Get users that would be deleted
    SELECT ARRAY_AGG(u.id)
    INTO users_to_delete
    FROM auth.users au
    JOIN public.users u ON au.id = u.id
    WHERE au.email IS NULL
    AND au.is_anonymous = true
    AND u.role = 'standard'
    AND (u.last_seen IS NULL OR u.last_seen < one_hour_ago)
    AND (u.online = false OR u.online IS NULL);

    deleted_count := COALESCE(array_length(users_to_delete, 1), 0);
    
    IF dry_run THEN
        -- Just report what would be deleted
        RETURN QUERY SELECT 
            'DRY RUN'::text as action,
            deleted_count as count,
            format('Would delete %s inactive anonymous users. Last activity before: %s', 
                   deleted_count, one_hour_ago::text) as details;
    ELSE
        -- Actually perform the cleanup
        IF deleted_count > 0 THEN
            -- Delete related data first
            DELETE FROM public.presence WHERE user_id = ANY(users_to_delete);
            DELETE FROM public.blocks WHERE blocker_id = ANY(users_to_delete) OR blocked_id = ANY(users_to_delete);
            DELETE FROM public.reports WHERE reporter_id = ANY(users_to_delete) OR reported_id = ANY(users_to_delete);
            DELETE FROM public.messages WHERE sender_id = ANY(users_to_delete) OR receiver_id = ANY(users_to_delete);
            DELETE FROM public.reactions WHERE user_id = ANY(users_to_delete);
            DELETE FROM public.typing WHERE user_id = ANY(users_to_delete);
            DELETE FROM public.photo_usage WHERE user_id = ANY(users_to_delete);
            
            -- Delete users
            DELETE FROM public.users WHERE id = ANY(users_to_delete);
            DELETE FROM auth.users WHERE id = ANY(users_to_delete);
        END IF;
        
        RETURN QUERY SELECT 
            'CLEANUP EXECUTED'::text as action,
            deleted_count as count,
            format('Successfully deleted %s inactive anonymous users. Cutoff time: %s', 
                   deleted_count, one_hour_ago::text) as details;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Grant necessary permissions
-- Grant execute permissions to authenticated users (so your app can call these)
GRANT EXECUTE ON FUNCTION cleanup_inactive_anonymous_users() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_inactive_anonymous_users_for_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION get_anonymous_user_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION safe_cleanup_anonymous_users(boolean) TO authenticated;

-- Step 6: Test queries (run these to verify the functions work)
-- Test 1: Get current stats
-- SELECT * FROM get_anonymous_user_stats();

-- Test 2: Dry run cleanup (safe - doesn't delete anything)
-- SELECT * FROM safe_cleanup_anonymous_users(true);

-- Test 3: Actually run cleanup (uncomment to execute)
-- SELECT * FROM safe_cleanup_anonymous_users(false);

-- Step 7: Create a scheduled job using pg_cron (if available)
-- Note: pg_cron needs to be enabled in your Supabase project
-- You can enable it in Supabase Dashboard > Database > Extensions

-- Enable pg_cron extension if not already enabled
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup to run every hour
-- SELECT cron.schedule(
--     'cleanup-anonymous-users',
--     '0 * * * *', -- Every hour at minute 0
--     'SELECT cleanup_inactive_anonymous_users();'
-- );

-- Alternative: Schedule cleanup every 30 minutes
-- SELECT cron.schedule(
--     'cleanup-anonymous-users-frequent',
--     '*/30 * * * *', -- Every 30 minutes
--     'SELECT safe_cleanup_anonymous_users(false);'
-- );

-- Step 8: Manual cleanup commands for immediate use

-- View current statistics:
SELECT 'Current Statistics:' as info;
SELECT * FROM get_anonymous_user_stats();

-- Run a dry run to see what would be deleted:
SELECT 'Dry Run Results:' as info;
SELECT * FROM safe_cleanup_anonymous_users(true);

-- Uncomment the following line to actually perform cleanup:
-- SELECT * FROM safe_cleanup_anonymous_users(false);

-- Step 9: Check existing cron jobs (if any)
-- SELECT * FROM cron.job;

-- Step 10: Monitor cleanup logs
-- Create a simple logging table for cleanup operations
CREATE TABLE IF NOT EXISTS public.cleanup_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation text NOT NULL,
    users_affected integer DEFAULT 0,
    details text,
    executed_at timestamptz DEFAULT NOW()
);

-- Grant permissions for cleanup logs
GRANT ALL ON public.cleanup_logs TO authenticated;

-- Function to log cleanup operations
CREATE OR REPLACE FUNCTION log_cleanup_operation(op text, users_count integer, details_text text)
RETURNS void AS $$
BEGIN
    INSERT INTO public.cleanup_logs (operation, users_affected, details)
    VALUES (op, users_count, details_text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION log_cleanup_operation(text, integer, text) TO authenticated;

-- Enhanced cleanup function with logging
CREATE OR REPLACE FUNCTION cleanup_anonymous_users_with_logging()
RETURNS void AS $$
DECLARE
    result_record RECORD;
BEGIN
    -- Run the cleanup and capture results
    SELECT * INTO result_record FROM safe_cleanup_anonymous_users(false);
    
    -- Log the operation
    PERFORM log_cleanup_operation(
        result_record.action,
        result_record.count::integer,
        result_record.details
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cleanup_anonymous_users_with_logging() TO authenticated;