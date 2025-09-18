-- REQUIRED: Run this in Supabase SQL Editor first
-- This creates the database functions your app needs

-- 1. Create cleanup_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS cleanup_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  operation text NOT NULL,
  users_affected integer NOT NULL DEFAULT 0,
  details text,
  executed_at timestamp with time zone DEFAULT now()
);

-- 2. Core cleanup function that your app calls
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
  SELECT COUNT(*) INTO user_count
  FROM users
  WHERE role = 'user'
    AND online = false
    AND last_seen < (now() - interval '1 hour')
    AND (email IS NULL OR email = '');

  -- If dry run, just return count
  IF dry_run THEN
    RETURN QUERY SELECT
      'DRY_RUN'::text as action,
      user_count as count,
      format('Would delete %s anonymous users offline for 1+ hours', user_count)::text as details;
  ELSE
    -- Actually delete the users
    DELETE FROM users
    WHERE role = 'user'
      AND online = false
      AND last_seen < (now() - interval '1 hour')
      AND (email IS NULL OR email = '');

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

-- 3. User statistics function
CREATE OR REPLACE FUNCTION get_anonymous_user_stats()
RETURNS TABLE(
  total_anonymous_users bigint,
  active_anonymous_users bigint,
  inactive_for_1h_plus bigint,
  ready_for_cleanup bigint
) AS $$
BEGIN
  RETURN QUERY SELECT
    (SELECT COUNT(*) FROM users WHERE role = 'user' AND (email IS NULL OR email = '')) as total_anonymous_users,
    (SELECT COUNT(*) FROM users WHERE role = 'user' AND online = true AND (email IS NULL OR email = '')) as active_anonymous_users,
    (SELECT COUNT(*) FROM users WHERE role = 'user' AND online = false AND last_seen < (now() - interval '1 hour') AND (email IS NULL OR email = '')) as inactive_for_1h_plus,
    (SELECT COUNT(*) FROM users WHERE role = 'user' AND online = false AND last_seen < (now() - interval '1 hour') AND (email IS NULL OR email = '')) as ready_for_cleanup;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Logging function
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

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION safe_cleanup_anonymous_users(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION get_anonymous_user_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION log_cleanup_operation(text, integer, text) TO authenticated;
GRANT SELECT, INSERT ON cleanup_logs TO authenticated;

-- Test the setup
SELECT 'Setup complete! Functions created successfully.' as status;