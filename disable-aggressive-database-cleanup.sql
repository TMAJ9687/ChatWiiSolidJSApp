-- DISABLE AGGRESSIVE DATABASE CLEANUP FUNCTIONS
-- This script disables all automatic cleanup functions that are deleting users too aggressively
-- Users should only be cleaned up after 1 hour from the APPLICATION LOGIC, not database functions

-- 1. DISABLE ANY ACTIVE CRON JOBS
-- Check if pg_cron extension exists and disable cleanup jobs
DO $$
BEGIN
    -- Check if pg_cron extension exists
    IF EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Disable the automatic cleanup job if it exists
        IF EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'cleanup-anonymous-users') THEN
            PERFORM cron.unschedule('cleanup-anonymous-users');
            RAISE NOTICE 'Disabled automatic cleanup job: cleanup-anonymous-users';
        END IF;

        -- Disable daily cleanup job if it exists
        IF EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'daily-user-cleanup') THEN
            PERFORM cron.unschedule('daily-user-cleanup');
            RAISE NOTICE 'Disabled automatic cleanup job: daily-user-cleanup';
        END IF;

        -- Disable heartbeat cleanup job if it exists
        IF EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'heartbeat-cleanup') THEN
            PERFORM cron.unschedule('heartbeat-cleanup');
            RAISE NOTICE 'Disabled automatic cleanup job: heartbeat-cleanup';
        END IF;

        RAISE NOTICE 'All automatic cleanup jobs have been disabled';
    ELSE
        RAISE NOTICE 'pg_cron extension not found - no automatic jobs to disable';
    END IF;
END
$$;

-- 2. MODIFY EXISTING CLEANUP FUNCTIONS TO BE LESS AGGRESSIVE
-- Update automated_daily_cleanup to require longer inactivity (6 hours instead of 1 hour)
CREATE OR REPLACE FUNCTION automated_daily_cleanup()
RETURNS TABLE(
  operation text,
  users_deleted integer,
  execution_time timestamp,
  details text
) AS $$
DECLARE
  deleted_count integer := 0;
  start_time timestamp := now();
BEGIN
  -- Delete anonymous users offline for 6+ hours (was 1 hour)
  -- Only delete users with role = 'standard' (anonymous), not 'admin' or 'vip'
  DELETE FROM users
  WHERE role = 'standard'
    AND online = false
    AND last_seen < (now() - interval '6 hours')  -- Changed from 1 hour to 6 hours
    AND (email IS NULL OR email = '');  -- Additional safety check for anonymous users

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Log the cleanup operation
  INSERT INTO cleanup_logs (operation, users_affected, details, executed_at)
  VALUES (
    'automated_daily_cleanup',
    deleted_count,
    format('Cleaned up %s anonymous users offline for 6+ hours', deleted_count),
    start_time
  );

  -- Return results
  RETURN QUERY SELECT
    'automated_daily_cleanup'::text as operation,
    deleted_count as users_deleted,
    start_time as execution_time,
    format('Successfully cleaned up %s anonymous users after 6+ hours inactivity', deleted_count)::text as details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. UPDATE CLEANUP FUNCTION TO REQUIRE 6 HOURS INSTEAD OF 1 HOUR
-- This function might be called by various cleanup processes
CREATE OR REPLACE FUNCTION cleanup_anonymous_users()
RETURNS json AS $$
DECLARE
  deleted_count INTEGER := 0;
  auth_deleted_count INTEGER := 0;
BEGIN
  -- Count users before deletion (for logging)
  SELECT COUNT(*) INTO deleted_count
  FROM users u
  WHERE u.role = 'standard'
    AND u.online = false
    AND u.last_seen < (now() - interval '6 hours')  -- Changed from 1 hour to 6 hours
    AND (u.email IS NULL OR u.email = '');

  -- Delete from users table first
  DELETE FROM users
  WHERE role = 'standard'
    AND online = false
    AND last_seen < (now() - interval '6 hours')  -- Changed from 1 hour to 6 hours
    AND (email IS NULL OR email = '');

  -- Delete corresponding auth users (only anonymous ones)
  DELETE FROM auth.users
  WHERE is_anonymous = true
    AND (last_sign_in_at < (now() - interval '6 hours') OR last_sign_in_at IS NULL);  -- Changed from 1 hour to 6 hours

  GET DIAGNOSTICS auth_deleted_count = ROW_COUNT;

  -- Log the operation
  INSERT INTO cleanup_logs (operation, users_affected, details, executed_at)
  VALUES (
    'cleanup_anonymous_users',
    deleted_count,
    format('Manual cleanup: deleted %s users from users table, %s from auth table after 6+ hours inactivity', deleted_count, auth_deleted_count),
    now()
  );

  RETURN json_build_object(
    'success', true,
    'users_deleted', deleted_count,
    'auth_users_deleted', auth_deleted_count,
    'message', format('Successfully cleaned up %s users after 6+ hours of inactivity', deleted_count),
    'timestamp', now()
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error
    INSERT INTO cleanup_logs (operation, users_affected, details, executed_at)
    VALUES (
      'cleanup_anonymous_users_error',
      0,
      format('Cleanup failed: %s', SQLERRM),
      now()
    );

    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Cleanup operation failed',
      'timestamp', now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ENSURE EMERGENCY CLEANUP FUNCTION ONLY RUNS ON ACTUAL BROWSER CLOSE
-- The emergency function should only be triggered manually, not automatically
-- Update it to log when it's called to track if it's being called too frequently
CREATE OR REPLACE FUNCTION emergency_user_offline(user_id UUID, cleanup_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW())
RETURNS JSONB AS $$
DECLARE
    user_role TEXT;
    cleanup_result TEXT := 'offline_only';
BEGIN
    -- Log every call to this function to track usage
    INSERT INTO cleanup_logs (operation, users_affected, details, executed_at)
    VALUES (
        'EMERGENCY_FUNCTION_CALLED',
        1,
        format('Emergency function called for user %s at %s', user_id::text, cleanup_timestamp::text),
        cleanup_timestamp
    );

    -- Check if user exists and get their role
    SELECT role INTO user_role
    FROM users
    WHERE id = user_id;

    IF user_role IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User not found',
            'user_id', user_id
        );
    END IF;

    -- Remove from presence table immediately (most critical for user list)
    DELETE FROM presence WHERE user_id = emergency_user_offline.user_id;

    -- Update user's last seen and online status
    UPDATE users
    SET online = false,
        last_seen = cleanup_timestamp
    WHERE id = emergency_user_offline.user_id;

    -- For standard users, perform complete cleanup ONLY if this is a genuine browser close
    -- We'll be more conservative and only do immediate cleanup, not deletion
    IF user_role = 'standard' THEN
        -- Just set offline, don't immediately delete
        -- Let the application cleanup handle deletion after proper time threshold
        cleanup_result := 'standard_offline_only';

        -- Log the emergency offline (not deletion)
        INSERT INTO cleanup_logs (operation, users_affected, details, executed_at)
        VALUES (
            'EMERGENCY_OFFLINE',
            1,
            format('Emergency offline for user %s via sendBeacon - NO DELETION', emergency_user_offline.user_id::text),
            cleanup_timestamp
        );
    ELSE
        -- For VIP/Admin users, just set offline
        cleanup_result := 'vip_offline_only';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Emergency offline completed: %s', cleanup_result),
        'user_id', user_id,
        'user_role', user_role,
        'cleanup_type', cleanup_result,
        'timestamp', cleanup_timestamp
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail completely
        INSERT INTO cleanup_logs (operation, users_affected, details, executed_at)
        VALUES (
            'EMERGENCY_CLEANUP_ERROR',
            0,
            format('Emergency cleanup failed for user %s: %s', emergency_user_offline.user_id::text, SQLERRM),
            cleanup_timestamp
        );

        RETURN jsonb_build_object(
            'success', false,
            'message', format('Emergency cleanup failed: %s', SQLERRM),
            'user_id', user_id,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. CHECK CURRENT STATUS
-- Show what cleanup jobs are currently active
DO $$
BEGIN
    -- Check if pg_cron extension exists and show active jobs
    IF EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        RAISE NOTICE 'pg_cron extension is installed';

        -- Show any remaining cron jobs
        IF EXISTS(SELECT 1 FROM cron.job) THEN
            RAISE NOTICE 'Active cron jobs found - check cron.job table';
        ELSE
            RAISE NOTICE 'No active cron jobs found';
        END IF;
    ELSE
        RAISE NOTICE 'pg_cron extension not installed - no automatic jobs possible';
    END IF;

    -- Log the fact that we've disabled aggressive cleanup
    INSERT INTO cleanup_logs (operation, users_affected, details, executed_at)
    VALUES (
        'DISABLE_AGGRESSIVE_CLEANUP',
        0,
        'Disabled aggressive database cleanup functions - users now only cleaned up by application logic after proper thresholds',
        now()
    );

    RAISE NOTICE 'Aggressive database cleanup functions have been disabled or made less aggressive';
    RAISE NOTICE 'Users will now only be cleaned up by application logic with proper 1-hour+ thresholds';
END
$$;