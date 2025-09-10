-- SQL Function to fix ghost users with elevated permissions
-- Run this in your Supabase SQL editor

-- Create function to fix ghost users
CREATE OR REPLACE FUNCTION fix_ghost_users()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function owner
AS $$
DECLARE
  ghost_count integer := 0;
  fixed_count integer := 0;
  result json;
BEGIN
  -- Count ghost users (users marked online but no presence records)
  SELECT COUNT(*) INTO ghost_count
  FROM users u
  WHERE u.online = true
  AND NOT EXISTS (
    SELECT 1 FROM presence p WHERE p.user_id = u.id
  );

  -- Fix ghost users by setting them offline
  UPDATE users 
  SET online = false, last_seen = NOW()
  WHERE online = true
  AND NOT EXISTS (
    SELECT 1 FROM presence p WHERE p.user_id = users.id
  );
  
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  
  -- Return result as JSON
  SELECT json_build_object(
    'success', true,
    'message', 'Fixed ' || fixed_count || ' ghost users',
    'ghost_count', ghost_count,
    'fixed_count', fixed_count,
    'timestamp', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Create function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM users),
    'online_users', (SELECT COUNT(*) FROM users WHERE online = true),
    'standard_users', (SELECT COUNT(*) FROM users WHERE role = 'standard'),
    'standard_online', (SELECT COUNT(*) FROM users WHERE role = 'standard' AND online = true),
    'vip_users', (SELECT COUNT(*) FROM users WHERE role = 'vip'),
    'admin_users', (SELECT COUNT(*) FROM users WHERE role = 'admin'),
    'presence_records', (SELECT COUNT(*) FROM presence),
    'ghost_users', (
      SELECT COUNT(*) FROM users u
      WHERE u.online = true
      AND NOT EXISTS (SELECT 1 FROM presence p WHERE p.user_id = u.id)
    ),
    'timestamp', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Create function to cleanup offline standard users
CREATE OR REPLACE FUNCTION cleanup_offline_standard_users()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer := 0;
  result json;
BEGIN
  -- Delete offline standard users and their related data
  WITH deleted_users AS (
    DELETE FROM users 
    WHERE role = 'standard' 
    AND online = false 
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted_users;
  
  -- Clean up orphaned data
  DELETE FROM presence WHERE user_id NOT IN (SELECT id FROM users);
  DELETE FROM messages WHERE sender_id NOT IN (SELECT id FROM users);
  
  SELECT json_build_object(
    'success', true,
    'message', 'Cleaned up ' || deleted_count || ' offline standard users',
    'deleted_count', deleted_count,
    'timestamp', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION fix_ghost_users() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_offline_standard_users() TO authenticated;