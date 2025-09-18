-- FINAL CORRECT VERSION: Based on your actual users table structure
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

-- 3. Core cleanup function (using is_anonymous column + role + last_seen)
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
  -- Anonymous users = is_anonymous = true OR (email IS NULL AND role != 'admin' AND role != 'vip')
  -- And offline for 1+ hours
  SELECT COUNT(*) INTO user_count
  FROM users
  WHERE (is_anonymous = true OR (email IS NULL AND role NOT IN ('admin', 'vip')))
    AND online = false
    AND last_seen < (now() - interval '1 hour');

  -- If dry run, just return count
  IF dry_run THEN
    RETURN QUERY SELECT
      'DRY_RUN'::text as action,
      user_count as count,
      format('Would delete %s anonymous users offline for 1+ hours', user_count)::text as details;
  ELSE
    -- Actually delete the users
    DELETE FROM users
    WHERE (is_anonymous = true OR (email IS NULL AND role NOT IN ('admin', 'vip')))
      AND online = false
      AND last_seen < (now() - interval '1 hour');

    GET DIAGNOSTICS user_count = ROW_COUNT;

    -- Log the operation
    INSERT INTO cleanup_logs (operation, users_affected, details, executed_at)
    VALUES (
      'safe_cleanup_anonymous_users',
      user_count,
      format('Deleted %s anonymous users offline for 1+ hours', user_count),
      now()
    );

    RETURN QUERY SELECT
      'CLEANUP_EXECUTED'::text as action,
      user_count as count,
      format('Successfully deleted %s anonymous users', user_count)::text as details;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. User statistics function
CREATE OR REPLACE FUNCTION get_anonymous_user_stats()
RETURNS TABLE(
  total_anonymous_users bigint,
  active_anonymous_users bigint,
  inactive_for_1h_plus bigint,
  ready_for_cleanup bigint
) AS $$
BEGIN
  RETURN QUERY SELECT
    (SELECT COUNT(*) FROM users WHERE is_anonymous = true OR (email IS NULL AND role NOT IN ('admin', 'vip'))) as total_anonymous_users,
    (SELECT COUNT(*) FROM users WHERE (is_anonymous = true OR (email IS NULL AND role NOT IN ('admin', 'vip'))) AND online = true) as active_anonymous_users,
    (SELECT COUNT(*) FROM users WHERE (is_anonymous = true OR (email IS NULL AND role NOT IN ('admin', 'vip'))) AND online = false AND last_seen < (now() - interval '1 hour')) as inactive_for_1h_plus,
    (SELECT COUNT(*) FROM users WHERE (is_anonymous = true OR (email IS NULL AND role NOT IN ('admin', 'vip'))) AND online = false AND last_seen < (now() - interval '1 hour')) as ready_for_cleanup;
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
SELECT 'Setup complete! Functions created using is_anonymous column.' as status;

-- 8. Quick test - see current user counts
SELECT * FROM get_anonymous_user_stats();