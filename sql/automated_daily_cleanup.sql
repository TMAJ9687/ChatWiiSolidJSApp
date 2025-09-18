-- Automated Daily Cleanup for Anonymous Users
-- Run this in your Supabase SQL Editor to set up automatic cleanup

-- 1. Create a function for automated cleanup
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
  -- Delete anonymous users offline for 1+ hours
  -- Only delete users with role = 'user' (anonymous), not 'admin' or 'vip'
  DELETE FROM users
  WHERE role = 'user'
    AND online = false
    AND last_seen < (now() - interval '1 hour')
    AND email IS NULL; -- Additional safety check for anonymous users

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Log the cleanup operation
  INSERT INTO cleanup_logs (operation, users_affected, details, executed_at)
  VALUES (
    'automated_daily_cleanup',
    deleted_count,
    format('Cleaned up %s anonymous users offline for 1+ hours', deleted_count),
    start_time
  );

  -- Return results
  RETURN QUERY SELECT
    'automated_daily_cleanup'::text as operation,
    deleted_count as users_deleted,
    start_time as execution_time,
    format('Successfully cleaned up %s anonymous users', deleted_count)::text as details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a scheduled job to run daily at 2 AM UTC
-- Note: This requires pg_cron extension (available in Supabase Pro)
-- Alternative: Use Supabase Edge Functions with cron

-- If you have pg_cron (Supabase Pro):
-- SELECT cron.schedule('daily-user-cleanup', '0 2 * * *', 'SELECT automated_daily_cleanup();');

-- 3. Manual trigger function (call this from your app)
CREATE OR REPLACE FUNCTION trigger_cleanup()
RETURNS json AS $$
DECLARE
  result record;
BEGIN
  SELECT * INTO result FROM automated_daily_cleanup();

  RETURN json_build_object(
    'success', true,
    'operation', result.operation,
    'users_deleted', result.users_deleted,
    'execution_time', result.execution_time,
    'details', result.details
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION automated_daily_cleanup() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_cleanup() TO authenticated;