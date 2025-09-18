-- CLEANUP AUTH.USERS TABLE: Remove orphaned anonymous users
-- This cleans the Authentication tab in Supabase Dashboard

-- 1. Drop existing functions first
DROP FUNCTION IF EXISTS safe_cleanup_anonymous_users(boolean);
DROP FUNCTION IF EXISTS get_anonymous_user_stats();
DROP FUNCTION IF EXISTS log_cleanup_operation(text, integer, text);

-- 2. Create cleanup_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS cleanup_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  operation text NOT NULL,
  users_affected integer NOT NULL DEFAULT 0,
  details text,
  executed_at timestamp with time zone DEFAULT now()
);

-- 3. Cleanup function for auth.users (what you see in Authentication tab)
CREATE OR REPLACE FUNCTION safe_cleanup_anonymous_users(dry_run boolean DEFAULT true)
RETURNS TABLE(
  action text,
  count integer,
  details text
) AS $$
DECLARE
  user_count integer := 0;
BEGIN
  -- Count orphaned auth users that:
  -- 1. Don't exist in your custom users table (orphaned)
  -- 2. Are anonymous (is_anonymous = true OR email IS NULL)
  -- 3. Haven't been active recently (last_sign_in_at < 1 hour ago OR NULL)
  SELECT COUNT(*) INTO user_count
  FROM auth.users au
  WHERE au.id NOT IN (SELECT id FROM users)  -- Orphaned users
    AND (au.is_anonymous = true OR au.email IS NULL)  -- Anonymous
    AND (au.last_sign_in_at < (now() - interval '1 hour') OR au.last_sign_in_at IS NULL);  -- Inactive

  -- If dry run, just return count
  IF dry_run THEN
    RETURN QUERY SELECT
      'DRY_RUN'::text as action,
      user_count as count,
      format('Would delete %s orphaned anonymous users from auth.users', user_count)::text as details;
  ELSE
    -- Actually delete the orphaned anonymous users
    DELETE FROM auth.users
    WHERE id NOT IN (SELECT id FROM users)
      AND (is_anonymous = true OR email IS NULL)
      AND (last_sign_in_at < (now() - interval '1 hour') OR last_sign_in_at IS NULL);

    GET DIAGNOSTICS user_count = ROW_COUNT;

    -- Log the operation
    INSERT INTO cleanup_logs (operation, users_affected, details, executed_at)
    VALUES (
      'safe_cleanup_anonymous_users',
      user_count,
      format('Deleted %s orphaned anonymous users from auth.users', user_count),
      now()
    );

    RETURN QUERY SELECT
      'CLEANUP_EXECUTED'::text as action,
      user_count as count,
      format('Successfully deleted %s orphaned anonymous auth users', user_count)::text as details;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Statistics function
CREATE OR REPLACE FUNCTION get_anonymous_user_stats()
RETURNS TABLE(
  total_auth_users bigint,
  active_chat_users bigint,
  orphaned_auth_users bigint,
  anonymous_orphaned_users bigint
) AS $$
BEGIN
  RETURN QUERY SELECT
    (SELECT COUNT(*) FROM auth.users) as total_auth_users,
    (SELECT COUNT(*) FROM users) as active_chat_users,
    (SELECT COUNT(*) FROM auth.users WHERE id NOT IN (SELECT id FROM users)) as orphaned_auth_users,
    (SELECT COUNT(*) FROM auth.users WHERE id NOT IN (SELECT id FROM users) AND (is_anonymous = true OR email IS NULL)) as anonymous_orphaned_users;
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
SELECT 'Setup complete! Ready to cleanup auth.users table.' as status;

-- 8. Show current stats
SELECT * FROM get_anonymous_user_stats();