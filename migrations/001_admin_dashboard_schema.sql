-- Admin Dashboard Schema Migration
-- Migration: 001_admin_dashboard_schema
-- Description: Add new tables and columns for admin dashboard functionality
-- Date: 2025-01-09

BEGIN;

-- Add new columns to existing users table for kick/ban status
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS kicked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS kick_reason TEXT,
ADD COLUMN IF NOT EXISTS ban_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ban_reason TEXT,
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_kicked BOOLEAN NOT NULL DEFAULT false;

-- Create site_settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    type VARCHAR(50) DEFAULT 'string',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create bans table
CREATE TABLE IF NOT EXISTS public.bans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    ip_address INET,
    reason TEXT NOT NULL,
    duration_hours INTEGER, -- NULL for permanent
    banned_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create bots table
CREATE TABLE IF NOT EXISTS public.bots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    interests TEXT[],
    behavior_settings JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create profanity_words table
CREATE TABLE IF NOT EXISTS public.profanity_words (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    word VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('nickname', 'chat')),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(word, type)
);

-- Create admin_audit_log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.users(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50), -- 'user', 'setting', 'bot', etc.
    target_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_kick_status table for temporary kick status tracking
CREATE TABLE IF NOT EXISTS public.user_kick_status (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    is_kicked BOOLEAN NOT NULL DEFAULT true,
    kicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    kicked_by UUID REFERENCES public.users(id),
    reason TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create feedback table (if not exists from reports)
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    email TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'in_progress', 'resolved')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;