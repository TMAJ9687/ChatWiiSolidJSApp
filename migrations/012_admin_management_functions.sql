-- Migration 012: Admin Management Functions
-- This migration adds functions to easily create and manage admin users

BEGIN;

-- Function to create admin user from existing auth user
CREATE OR REPLACE FUNCTION create_admin_user(
    p_user_id UUID,
    p_nickname TEXT,
    p_gender TEXT DEFAULT 'male',
    p_age INTEGER DEFAULT 30,
    p_country TEXT DEFAULT 'United States'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auth_user_exists BOOLEAN;
    result JSONB;
BEGIN
    -- Check if auth user exists
    SELECT EXISTS(
        SELECT 1 FROM auth.users WHERE id = p_user_id
    ) INTO auth_user_exists;
    
    IF NOT auth_user_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Auth user not found. User must be registered first.'
        );
    END IF;
    
    -- Validate inputs
    IF p_gender NOT IN ('male', 'female') THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Gender must be either "male" or "female"'
        );
    END IF;
    
    IF p_age < 18 OR p_age > 120 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Age must be between 18 and 120'
        );
    END IF;
    
    -- Insert or update user profile
    INSERT INTO public.users (
        id,
        nickname,
        gender,
        age,
        country,
        role,
        status,
        online,
        avatar,
        created_at
    ) VALUES (
        p_user_id,
        p_nickname,
        p_gender,
        p_age,
        p_country,
        'admin',
        'active',
        false,
        '',
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        role = 'admin',
        status = 'active',
        nickname = EXCLUDED.nickname,
        gender = EXCLUDED.gender,
        age = EXCLUDED.age,
        country = EXCLUDED.country;
    
    -- Create admin settings
    INSERT INTO public.admin_settings (admin_id)
    VALUES (p_user_id)
    ON CONFLICT (admin_id) DO NOTHING;
    
    -- Log the admin creation
    INSERT INTO public.admin_logs (
        admin_id, admin_nickname, action, target_type, target_id, details
    ) VALUES (
        p_user_id, p_nickname, 'create_admin', 'user', p_user_id,
        jsonb_build_object(
            'created_by', 'system',
            'timestamp', NOW()
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Admin user created successfully',
        'user_id', p_user_id,
        'nickname', p_nickname,
        'role', 'admin'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error creating admin user: ' || SQLERRM
        );
END;
$$;

-- Function to promote existing user to admin
CREATE OR REPLACE FUNCTION promote_to_admin(
    p_user_id UUID,
    p_promoted_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
    promoter_record RECORD;
    result JSONB;
BEGIN
    -- Get user record
    SELECT * INTO user_record
    FROM public.users
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User not found'
        );
    END IF;
    
    -- Check if user is already admin
    IF user_record.role = 'admin' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User is already an admin'
        );
    END IF;
    
    -- If promoted by someone, verify they are admin
    IF p_promoted_by IS NOT NULL THEN
        SELECT * INTO promoter_record
        FROM public.users
        WHERE id = p_promoted_by AND role = 'admin';
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Only admins can promote users to admin'
            );
        END IF;
    END IF;
    
    -- Promote user to admin
    UPDATE public.users
    SET role = 'admin', status = 'active'
    WHERE id = p_user_id;
    
    -- Create admin settings
    INSERT INTO public.admin_settings (admin_id)
    VALUES (p_user_id)
    ON CONFLICT (admin_id) DO NOTHING;
    
    -- Log the promotion
    INSERT INTO public.admin_logs (
        admin_id, admin_nickname, action, target_type, target_id, details
    ) VALUES (
        COALESCE(p_promoted_by, p_user_id),
        COALESCE(promoter_record.nickname, 'system'),
        'promote_to_admin',
        'user',
        p_user_id,
        jsonb_build_object(
            'target_nickname', user_record.nickname,
            'promoted_by', COALESCE(promoter_record.nickname, 'system'),
            'timestamp', NOW()
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'User promoted to admin successfully',
        'user_id', p_user_id,
        'nickname', user_record.nickname,
        'old_role', user_record.role,
        'new_role', 'admin'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error promoting user to admin: ' || SQLERRM
        );
END;
$$;

-- Function to find user by email
CREATE OR REPLACE FUNCTION find_user_by_email(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'success', true,
        'users', jsonb_agg(
            jsonb_build_object(
                'auth_id', au.id,
                'email', au.email,
                'email_confirmed', au.email_confirmed_at IS NOT NULL,
                'created_at', au.created_at,
                'profile_exists', u.id IS NOT NULL,
                'nickname', u.nickname,
                'role', u.role,
                'status', u.status
            )
        )
    ) INTO result
    FROM auth.users au
    LEFT JOIN public.users u ON au.id = u.id
    WHERE au.email ILIKE p_email;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error finding user: ' || SQLERRM
        );
END;
$$;

-- Function to list all admins
CREATE OR REPLACE FUNCTION list_admin_users()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'success', true,
        'admins', jsonb_agg(
            jsonb_build_object(
                'id', u.id,
                'nickname', u.nickname,
                'email', au.email,
                'status', u.status,
                'online', u.online,
                'created_at', u.created_at,
                'last_seen', u.last_seen
            )
        )
    ) INTO result
    FROM public.users u
    LEFT JOIN auth.users au ON u.id = au.id
    WHERE u.role = 'admin'
    ORDER BY u.created_at DESC;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error listing admins: ' || SQLERRM
        );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_admin_user(UUID, TEXT, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION promote_to_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION find_user_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION list_admin_users() TO authenticated;

-- Add comments
COMMENT ON FUNCTION create_admin_user IS 'Create admin user from existing auth user';
COMMENT ON FUNCTION promote_to_admin IS 'Promote existing user to admin role';
COMMENT ON FUNCTION find_user_by_email IS 'Find user by email address';
COMMENT ON FUNCTION list_admin_users IS 'List all admin users';

COMMIT;