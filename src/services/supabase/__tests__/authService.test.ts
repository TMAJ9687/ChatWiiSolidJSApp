import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from '../authService';
import { supabase } from '../../../config/supabase';
import { presenceService } from '../presenceService';
import { connectionService } from '../../connectionService';

// Mock dependencies
vi.mock('../../../config/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signInAnonymously: vi.fn(),
      getUser: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock('../presenceService', () => ({
  presenceService: {
    setUserOnline: vi.fn(),
    setUserOffline: vi.fn(),
  },
}));

vi.mock('../../connectionService', () => ({
  connectionService: {
    executeWithRetry: vi.fn(),
  },
}));

describe('AuthService', () => {
  const mockSupabaseAuth = vi.mocked(supabase.auth);
  const mockSupabaseFrom = vi.mocked(supabase.from);
  const mockPresenceService = vi.mocked(presenceService);
  const mockConnectionService = vi.mocked(connectionService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('signInWithEmail', () => {
    it('should successfully sign in admin user with email', async () => {
      const mockAuthData = {
        user: { id: 'admin-123' },
        session: { access_token: 'token' }
      };

      const mockUserProfile = {
        id: 'admin-123',
        nickname: 'Admin User',
        role: 'admin',
        gender: 'male',
        age: 30,
        country: 'US',
        avatar: '/avatars/admin.png',
        created_at: '2024-01-01T00:00:00Z',
        status: 'active',
        online: true,
        last_seen: null,
        vip_expires_at: null
      };

      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: mockAuthData,
        error: null
      });

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockUserProfile,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockChain as any);

      const result = await authService.signInWithEmail('admin@test.com', 'password');

      expect(result.id).toBe('admin-123');
      expect(result.role).toBe('admin');
      expect(result.nickname).toBe('Admin User');
      expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'admin@test.com',
        password: 'password'
      });
    });

    it('should throw error on authentication failure', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' }
      });

      await expect(authService.signInWithEmail('admin@test.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });

    it('should throw error when user profile not found', async () => {
      const mockAuthData = {
        user: { id: 'admin-123' },
        session: { access_token: 'token' }
      };

      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: mockAuthData,
        error: null
      });

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'User not found' }
        })
      };

      mockSupabaseFrom.mockReturnValue(mockChain as any);

      await expect(authService.signInWithEmail('admin@test.com', 'password')).rejects.toThrow('User profile not found');
    });
  });

  describe('signInAnonymously', () => {
    it('should successfully create anonymous user', async () => {
      const mockAuthData = {
        user: { id: 'user-123' },
        session: { access_token: 'token' }
      };

      const userData = {
        nickname: 'TestUser',
        gender: 'male' as const,
        age: 25,
        country: 'US'
      };

      mockSupabaseAuth.signInAnonymously.mockResolvedValue({
        data: mockAuthData,
        error: null
      });

      const mockInsertChain = {
        insert: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom.mockReturnValue(mockInsertChain as any);
      mockPresenceService.setUserOnline.mockResolvedValue();

      const result = await authService.signInAnonymously(userData);

      expect(result.id).toBe('user-123');
      expect(result.nickname).toBe('TestUser');
      expect(result.role).toBe('standard');
      expect(mockPresenceService.setUserOnline).toHaveBeenCalled();
    });

    it('should handle authentication error', async () => {
      mockSupabaseAuth.signInAnonymously.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Anonymous auth failed' }
      });

      const userData = {
        nickname: 'TestUser',
        gender: 'male' as const,
        age: 25,
        country: 'US'
      };

      await expect(authService.signInAnonymously(userData)).rejects.toThrow('Failed to sign in. Please try again.');
    });

    it('should handle profile creation error', async () => {
      const mockAuthData = {
        user: { id: 'user-123' },
        session: { access_token: 'token' }
      };

      mockSupabaseAuth.signInAnonymously.mockResolvedValue({
        data: mockAuthData,
        error: null
      });

      const mockInsertChain = {
        insert: vi.fn().mockResolvedValue({ error: { message: 'Profile creation failed' } })
      };

      mockSupabaseFrom.mockReturnValue(mockInsertChain as any);

      const userData = {
        nickname: 'TestUser',
        gender: 'male' as const,
        age: 25,
        country: 'US'
      };

      await expect(authService.signInAnonymously(userData)).rejects.toThrow('Profile creation failed');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user with connection service', async () => {
      const mockUser = { id: 'user-123' };
      const mockUserProfile = {
        id: 'user-123',
        nickname: 'TestUser',
        role: 'standard',
        gender: 'male',
        age: 25,
        country: 'US',
        avatar: '/avatars/standard/male.png',
        created_at: '2024-01-01T00:00:00Z',
        status: 'active',
        online: true,
        last_seen: null,
        vip_expires_at: null
      };

      mockConnectionService.executeWithRetry
        .mockResolvedValueOnce({ data: { user: mockUser } })
        .mockResolvedValueOnce({ data: mockUserProfile, error: null });

      const result = await authService.getCurrentUser();

      expect(result?.id).toBe('user-123');
      expect(result?.nickname).toBe('TestUser');
      expect(mockConnectionService.executeWithRetry).toHaveBeenCalledTimes(2);
    });

    it('should return null for kicked user and sign out', async () => {
      const mockUser = { id: 'user-123' };
      const mockUserProfile = {
        id: 'user-123',
        nickname: 'TestUser',
        role: 'standard',
        gender: 'male',
        age: 25,
        country: 'US',
        avatar: '/avatars/standard/male.png',
        created_at: '2024-01-01T00:00:00Z',
        status: 'kicked',
        online: false,
        last_seen: null,
        vip_expires_at: null
      };

      mockConnectionService.executeWithRetry
        .mockResolvedValueOnce({ data: { user: mockUser } })
        .mockResolvedValueOnce({ data: mockUserProfile, error: null });

      mockSupabaseAuth.signOut.mockResolvedValue({ error: null });
      mockPresenceService.setUserOffline.mockResolvedValue();

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };
      mockSupabaseFrom.mockReturnValue(mockUpdateChain as any);

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
      expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
    });

    it('should return null for banned user and sign out', async () => {
      const mockUser = { id: 'user-123' };
      const mockUserProfile = {
        id: 'user-123',
        nickname: 'TestUser',
        role: 'standard',
        gender: 'male',
        age: 25,
        country: 'US',
        avatar: '/avatars/standard/male.png',
        created_at: '2024-01-01T00:00:00Z',
        status: 'banned',
        online: false,
        last_seen: null,
        vip_expires_at: null
      };

      mockConnectionService.executeWithRetry
        .mockResolvedValueOnce({ data: { user: mockUser } })
        .mockResolvedValueOnce({ data: mockUserProfile, error: null });

      mockSupabaseAuth.signOut.mockResolvedValue({ error: null });
      mockPresenceService.setUserOffline.mockResolvedValue();

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };
      mockSupabaseFrom.mockReturnValue(mockUpdateChain as any);

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
      expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
    });

    it('should fallback to basic retry when connection service fails', async () => {
      const mockUser = { id: 'user-123' };
      const mockUserProfile = {
        id: 'user-123',
        nickname: 'TestUser',
        role: 'standard',
        gender: 'male',
        age: 25,
        country: 'US',
        avatar: '/avatars/standard/male.png',
        created_at: '2024-01-01T00:00:00Z',
        status: 'active',
        online: true,
        last_seen: null,
        vip_expires_at: null
      };

      // Connection service fails, fallback to basic retry
      mockConnectionService.executeWithRetry
        .mockRejectedValueOnce(new Error('Connection service failed'))
        .mockResolvedValueOnce({ data: mockUserProfile, error: null });

      mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const result = await authService.getCurrentUser();

      expect(result?.id).toBe('user-123');
      expect(mockSupabaseAuth.getUser).toHaveBeenCalled();
    });

    it('should return null when no user is authenticated', async () => {
      mockConnectionService.executeWithRetry.mockResolvedValue({ data: { user: null } });

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      mockConnectionService.executeWithRetry.mockRejectedValue(new Error('Failed to fetch'));
      mockSupabaseAuth.getUser.mockRejectedValue(new Error('Failed to fetch'));

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('signOut', () => {
    it('should sign out user and update presence', async () => {
      // Set up a current user
      const mockUser = { id: 'user-123' };
      (authService as any).currentUser = mockUser;

      mockPresenceService.setUserOffline.mockResolvedValue();
      mockSupabaseAuth.signOut.mockResolvedValue({ error: null });

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };
      mockSupabaseFrom.mockReturnValue(mockUpdateChain as any);

      await authService.signOut();

      expect(mockPresenceService.setUserOffline).toHaveBeenCalledWith('user-123');
      expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
      expect(mockUpdateChain.update).toHaveBeenCalledWith({
        online: false,
        last_seen: expect.any(String),
        nickname: "Deleted User"
      });
    });

    it('should handle sign out when no current user', async () => {
      (authService as any).currentUser = null;

      mockSupabaseAuth.signOut.mockResolvedValue({ error: null });

      await authService.signOut();

      expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
      expect(mockPresenceService.setUserOffline).not.toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    it('should return current user ID', () => {
      (authService as any).currentUser = { id: 'user-123' };
      expect(authService.getCurrentUserId()).toBe('user-123');
    });

    it('should return null when no current user', () => {
      (authService as any).currentUser = null;
      expect(authService.getCurrentUserId()).toBeNull();
    });

    it('should check authentication status', () => {
      (authService as any).currentUser = { id: 'user-123' };
      expect(authService.isAuthenticated()).toBe(true);

      (authService as any).currentUser = null;
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should set up auth state change listener', () => {
      const callback = vi.fn();
      authService.onAuthStateChange(callback);
      expect(mockSupabaseAuth.onAuthStateChange).toHaveBeenCalled();
    });
  });
});