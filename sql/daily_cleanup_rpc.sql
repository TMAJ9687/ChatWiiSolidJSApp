-- Create RPC function for daily aggressive cleanup
-- Run this in Supabase SQL Editor to enable automatic daily cleanup

-- 1. Create the auth cleanup function
CREATE OR REPLACE FUNCTION cleanup_anonymous_auth_users()
RETURNS integer AS $$
DECLARE
  deleted_count integer := 0;
BEGIN
  -- Delete anonymous users from auth.users
  DELETE FROM auth.users
  WHERE is_anonymous = true;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update the main cleanup function to use aggressive approach
CREATE OR REPLACE FUNCTION safe_cleanup_anonymous_users(dry_run boolean DEFAULT true)
RETURNS TABLE(
  action text,
  count integer,
  details text
) AS $$
DECLARE
  standard_users_count integer := 0;
  auth_users_count integer := 0;
  total_count integer := 0;
BEGIN
  -- Count standard users in custom table
  SELECT COUNT(*) INTO standard_users_count
  FROM users
  WHERE role = 'standard';

  -- Count anonymous users in auth table
  SELECT COUNT(*) INTO auth_users_count
  FROM auth.users
  WHERE is_anonymous = true;

  total_count := standard_users_count;

  -- If dry run, just return count
  IF dry_run THEN
    RETURN QUERY SELECT
      'DRY_RUN'::text as action,
      total_count as count,
      format('Would delete %s standard users from both tables', total_count)::text as details;
  ELSE
    -- Actually delete - aggressive cleanup

    -- Delete from custom users table
    DELETE FROM users
    WHERE role = 'standard';

    -- Delete from auth.users table
    DELETE FROM auth.users
    WHERE is_anonymous = true;

    -- Log the operation
    INSERT INTO cleanup_logs (operation, users_affected, details, executed_at)
    VALUES (
      'aggressive_cleanup',
      total_count,
      format('Aggressively deleted %s users from both tables', total_count),
      now()
    );

    RETURN QUERY SELECT
      'AGGRESSIVE_CLEANUP_EXECUTED'::text as action,
      total_count as count,
      format('Successfully deleted %s users from both tables', total_count)::text as details;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION cleanup_anonymous_auth_users() TO authenticated;
GRANT EXECUTE ON FUNCTION safe_cleanup_anonymous_users(boolean) TO authenticated;

SELECT 'Aggressive daily cleanup functions ready!' as status;