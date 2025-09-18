-- CORRECT VERSION: Fixed for your actual users table structure
-- Run this in Supabase SQL Editor

-- 1. Drop existing functions first
DROP FUNCTION IF EXISTS safe_cleanup_anonymous_users(boolean);
DROP FUNCTION IF EXISTS get_anonymous_user_stats();
DROP FUNCTION IF EXISTS log_cleanup_operation(text, integer, text);
DROP FUNCTION IF EXISTS automated_daily_cleanup();
DROP FUNCTION IF EXISTS trigger_cleanup();

-- 2. Create cleanup_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS cleanup_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  operation text NOT NULL,
  users_affected integer NOT NULL DEFAULT 0,
  details text,
  executed_at timestamp with time zone DEFAULT now()
);

-- 3. Core cleanup function (fixed for your table structure)
CREATE OR REPLACE FUNCTION safe_cleanup_anonymous_users(dry_run boolean DEFAULT true)
RETURNS TABLE(
  action text,
  count integer,
  details text
) AS $$
DECLARE
  user_count integer := 0;
BEGIN
  -- Count users that would be deleted
  -- Anonymous users = role 'standard' (not 'vip' or 'admin'), offline for 1+ hours
  SELECT COUNT(*) INTO user_count
  FROM users
  WHERE role = 'standard'
    AND online = false
    AND last_seen < EXTRACT(EPOCH FROM (now() - interval '1 hour')) * 1000; -- Convert to milliseconds

  -- If dry run, just return count
  IF dry_run THEN
    RETURN QUERY SELECT
      'DRY_RUN'::text as action,
      user_count as count,
      format('Would delete %s standard users offline for 1+ hours', user_count)::text as details;
  ELSE
    -- Actually delete the users
    DELETE FROM users
    WHERE role = 'standard'
      AND online = false
      AND last_seen < EXTRACT(EPOCH FROM (now() - interval '1 hour')) * 1000;

    GET DIAGNOSTICS user_count = ROW_COUNT;

    -- Log the operation
    INSERT INTO cleanup_logs (operation, users_affected, details, executed_at)
    VALUES (
      'safe_cleanup_anonymous_users',
      user_count,
      format('Deleted %s standard users offline for 1+ hours', user_count),
      now()
    );

    RETURN QUERY SELECT
      'CLEANUP_EXECUTED'::text as action,
      user_count as count,
      format('Successfully deleted %s standard users', user_count)::text as details;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. User statistics function (fixed)
CREATE OR REPLACE FUNCTION get_anonymous_user_stats()
RETURNS TABLE(
  total_anonymous_users bigint,
  active_anonymous_users bigint,
  inactive_for_1h_plus bigint,
  ready_for_cleanup bigint
) AS $$
BEGIN
  RETURN QUERY SELECT
    (SELECT COUNT(*) FROM users WHERE role = 'standard') as total_anonymous_users,
    (SELECT COUNT(*) FROM users WHERE role = 'standard' AND online = true) as active_anonymous_users,
    (SELECT COUNT(*) FROM users WHERE role = 'standard' AND online = false AND last_seen < EXTRACT(EPOCH FROM (now() - interval '1 hour')) * 1000) as inactive_for_1h_plus,
    (SELECT COUNT(*) FROM users WHERE role = 'standard' AND online = false AND last_seen < EXTRACT(EPOCH FROM (now() - interval '1 hour')) * 1000) as ready_for_cleanup;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Logging function
CREATE OR REPLACE FUNCTION log_cleanup_operation(
  op text,
  users_count integer,
  details_text text
)
RETURNS void AS $$
BEGIN
  INSERT INTO cleanup_logs (operation, users_affected, details, executed_at)
  VALUES (op, users_count, details_text, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION safe_cleanup_anonymous_users(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION get_anonymous_user_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION log_cleanup_operation(text, integer, text) TO authenticated;
GRANT SELECT, INSERT ON cleanup_logs TO authenticated;

-- 7. Test the setup
SELECT 'Setup complete! Functions recreated for standard users.' as status;

-- 8. Quick test - see current user counts
SELECT * FROM get_anonymous_user_stats();