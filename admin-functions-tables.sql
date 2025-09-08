-- Admin Functions and Tables Setup for ChatWii
-- Run this in your Supabase SQL editor to set up admin functionality
-- This assumes the main supabase-setup.sql has already been run

-- =====================================================
-- ADMIN-SPECIFIC TABLES
-- =====================================================

-- Admin audit log table to track admin actions
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  admin_nickname TEXT NOT NULL,
  action TEXT NOT NULL, -- 'ban_user', 'kick_user', 'upgrade_vip', 'resolve_report', etc.
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'report', 'message', 'system')),
  target_id UUID, -- ID of the affected user/report/message
  target_info JSONB, -- Additional info about the target (nickname, etc.)
  reason TEXT,
  details JSONB, -- Action-specific details
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin session tracking
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  admin_nickname TEXT NOT NULL,
  login_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_time TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  session_duration INTERVAL GENERATED ALWAYS AS (logout_time - login_time) STORED
);

-- Admin settings/preferences
CREATE TABLE IF NOT EXISTS public.admin_settings (
  admin_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN DEFAULT true,
  auto_logout_minutes INTEGER DEFAULT 60,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System-wide admin announcements
CREATE TABLE IF NOT EXISTS public.admin_announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  admin_nickname TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'maintenance', 'feature')),
  active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  target_roles TEXT[] DEFAULT ARRAY['standard', 'vip'], -- Which user roles should see this
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON public.admin_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON public.admin_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target ON public.admin_logs(target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON public.admin_sessions(admin_id, login_time DESC);
CREATE INDEX IF NOT EXISTS idx_admin_announcements_active ON public.admin_announcements(active, start_date DESC) WHERE active = true;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_announcements ENABLE ROW LEVEL SECURITY;

-- Admin logs policies (only admins can read/write)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_logs' AND policyname = 'Only admins can read admin logs'
    ) THEN
        CREATE POLICY "Only admins can read admin logs" ON public.admin_logs
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.users 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_logs' AND policyname = 'Only admins can insert admin logs'
    ) THEN
        CREATE POLICY "Only admins can insert admin logs" ON public.admin_logs
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.users 
                    WHERE id = auth.uid() AND role = 'admin' AND id = admin_id
                )
            );
    END IF;
END $$;

-- Admin sessions policies
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_sessions' AND policyname = 'Admins can read their own sessions'
    ) THEN
        CREATE POLICY "Admins can read their own sessions" ON public.admin_sessions
            FOR SELECT USING (
                auth.uid() = admin_id AND 
                EXISTS (
                    SELECT 1 FROM public.users 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_sessions' AND policyname = 'Admins can manage their own sessions'
    ) THEN
        CREATE POLICY "Admins can manage their own sessions" ON public.admin_sessions
            FOR ALL USING (
                auth.uid() = admin_id AND 
                EXISTS (
                    SELECT 1 FROM public.users 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

-- Admin settings policies
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_settings' AND policyname = 'Admins can manage their own settings'
    ) THEN
        CREATE POLICY "Admins can manage their own settings" ON public.admin_settings
            FOR ALL USING (
                auth.uid() = admin_id AND 
                EXISTS (
                    SELECT 1 FROM public.users 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

-- Admin announcements policies
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_announcements' AND policyname = 'Only admins can manage announcements'
    ) THEN
        CREATE POLICY "Only admins can manage announcements" ON public.admin_announcements
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.users 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_announcements' AND policyname = 'All users can read active announcements'
    ) THEN
        CREATE POLICY "All users can read active announcements" ON public.admin_announcements
            FOR SELECT USING (
                auth.role() = 'authenticated' AND 
                active = true AND 
                (start_date IS NULL OR start_date <= NOW()) AND 
                (end_date IS NULL OR end_date > NOW())
            );
    END IF;
END $$;

-- =====================================================
-- ADMIN FUNCTIONS
-- =====================================================

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
    p_admin_id UUID,
    p_action TEXT,
    p_target_type TEXT,
    p_target_id UUID DEFAULT NULL,
    p_target_info JSONB DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    log_id UUID;
    admin_nick TEXT;
BEGIN
    -- Get admin nickname
    SELECT nickname INTO admin_nick
    FROM public.users
    WHERE id = p_admin_id AND role = 'admin';
    
    IF admin_nick IS NULL THEN
        RAISE EXCEPTION 'Invalid admin ID or user is not an admin';
    END IF;
    
    -- Insert log entry
    INSERT INTO public.admin_logs (
        admin_id, admin_nickname, action, target_type, 
        target_id, target_info, reason, details
    ) VALUES (
        p_admin_id, admin_nick, p_action, p_target_type,
        p_target_id, p_target_info, p_reason, p_details
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- Function to get admin dashboard stats with proper security
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stats JSONB;
    requesting_user_role TEXT;
BEGIN
    -- Check if requesting user is admin
    SELECT role INTO requesting_user_role
    FROM public.users
    WHERE id = auth.uid();
    
    IF requesting_user_role != 'admin' THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Gather stats
    SELECT jsonb_build_object(
        'totalUsers', (SELECT COUNT(*) FROM public.users),
        'activeUsers', (SELECT COUNT(*) FROM public.users WHERE status = 'active'),
        'bannedUsers', (SELECT COUNT(*) FROM public.users WHERE status = 'banned'),
        'kickedUsers', (SELECT COUNT(*) FROM public.users WHERE status = 'kicked'),
        'vipUsers', (SELECT COUNT(*) FROM public.users WHERE role = 'vip'),
        'onlineUsers', (SELECT COUNT(*) FROM public.presence WHERE online = true),
        'totalReports', (SELECT COUNT(*) FROM public.reports),
        'pendingReports', (SELECT COUNT(*) FROM public.reports WHERE status = 'pending'),
        'resolvedReports', (SELECT COUNT(*) FROM public.reports WHERE status = 'resolved'),
        'totalMessages', (SELECT COUNT(*) FROM public.messages),
        'totalBlocks', (SELECT COUNT(*) FROM public.blocks),
        'adminActions24h', (
            SELECT COUNT(*) FROM public.admin_logs 
            WHERE created_at > NOW() - INTERVAL '24 hours'
        )
    ) INTO stats;
    
    RETURN stats;
END;
$$;

-- Function to safely update user status with logging
CREATE OR REPLACE FUNCTION admin_update_user_status(
    p_target_user_id UUID,
    p_new_status TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_user_id UUID;
    admin_role TEXT;
    target_user RECORD;
    old_status TEXT;
BEGIN
    admin_user_id := auth.uid();
    
    -- Verify admin permissions
    SELECT role INTO admin_role
    FROM public.users
    WHERE id = admin_user_id;
    
    IF admin_role != 'admin' THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Validate status
    IF p_new_status NOT IN ('active', 'banned', 'kicked') THEN
        RAISE EXCEPTION 'Invalid status. Must be: active, banned, or kicked';
    END IF;
    
    -- Get target user info
    SELECT * INTO target_user
    FROM public.users
    WHERE id = p_target_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    old_status := target_user.status;
    
    -- Update user status
    UPDATE public.users
    SET status = p_new_status
    WHERE id = p_target_user_id;
    
    -- If banning or kicking, set user offline
    IF p_new_status IN ('banned', 'kicked') THEN
        UPDATE public.presence
        SET online = false, last_seen = NOW()
        WHERE user_id = p_target_user_id;
    END IF;
    
    -- Log the action
    PERFORM log_admin_action(
        admin_user_id,
        'update_user_status',
        'user',
        p_target_user_id,
        jsonb_build_object(
            'nickname', target_user.nickname,
            'old_status', old_status,
            'new_status', p_new_status
        ),
        p_reason
    );
    
    RETURN TRUE;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update admin_settings.updated_at
CREATE OR REPLACE FUNCTION update_admin_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_admin_settings_updated_at_trigger'
    ) THEN
        CREATE TRIGGER update_admin_settings_updated_at_trigger
            BEFORE UPDATE ON public.admin_settings
            FOR EACH ROW
            EXECUTE FUNCTION update_admin_settings_updated_at();
    END IF;
END $$;

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Create admin settings for existing admin users
INSERT INTO public.admin_settings (admin_id)
SELECT id FROM public.users WHERE role = 'admin'
ON CONFLICT (admin_id) DO NOTHING;

-- Grant realtime subscriptions for admin tables
DO $$ BEGIN
    -- Add admin_logs to realtime if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'admin_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_logs;
    END IF;
    
    -- Add admin_announcements to realtime if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'admin_announcements'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_announcements;
    END IF;
END $$;