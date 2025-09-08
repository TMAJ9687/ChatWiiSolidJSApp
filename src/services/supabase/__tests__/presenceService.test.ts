import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { presenceService } from '../presenceService';
import { supabase } from '../../../config/supabase';
import type { User } from '../../../types/user.types';

// Mock supabase
vi.mock('../../../config/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      track: vi.fn(),
    })),
  },
}));

// Mock browser APIs
Object.defineProperty(global, 'navigator', {
  value: {
    sendBeacon: vi.fn(),
  },
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  writable: true,
});

Object.defineProperty(global, 'document', {
  value: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    hidden: false,
  },
  writable: true,
});

describe('PresenceService', () => {
  const mockSupabaseFrom = vi.mocked(supabase.from);
  const mockSupabaseChannel = vi.mocked(supabase.channel);

  const mockUser: User = {
    id: 'user-123',
    nickname: 'TestUser',
    gender: 'male',
    age: 25,
    country: 'US',
    role: 'standard',
    status: 'active',
    online: true,
    avatar: '/avatars/standard/male.png',
    createdAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('setUserOnline', () => {
    it('should set user online and set up presence tracking', async () => {
      const mockUpsertChain = {
        upsert: vi.fn().mockResolvedValue({ error: null })
      };

      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockImplementation((callback) => {
          callback('SUBSCRIBED');
          return Promise.resolve();
        }),
        track: vi.fn().mockResolvedValue({}),
        unsubscribe: vi.fn(),
      };

      mockSupabaseFrom.mockReturnValue(mockUpsertChain as any);
      mockSupabaseChannel.mockReturnValue(mockChannel as any);

      await presenceService.setUserOnline(mockUser);

      expect(mockUpsertChain.upsert).toHaveBeenCalledWith(
        [expect.objectContaining({
          user_id: 'user-123',
          online: true,
          nickname: 'TestUser',
          gender: 'male',
          age: 25,
          country: 'US',
          role: 'standard',
        })],
        { onConflict: 'user_id' }
      );

      expect(mockSupabaseChannel).toHaveBeenCalledWith('presence:user-123', {
        config: {
          presence: {
            key: 'user-123',
          },
        },
      });

      expect(mockChannel.track).toHaveBeenCalled();
    });

    it('should handle database error when setting user online', async () => {
      const mockUpsertChain = {
        upsert: vi.fn().mockResolvedValue({ error: { message: 'Database error' } })
      };

      mockSupabaseFrom.mockReturnValue(mockUpsertChain as any);

      await expect(presenceService.setUserOnline(mockUser)).rejects.toThrow();
    });

    it('should set up heartbeat interval for activity updates', async () => {
      const mockUpsertChain = {
        upsert: vi.fn().mockResolvedValue({ error: null })
      };

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockImplementation((callback) => {
          callback('SUBSCRIBED');
          return Promise.resolve();
        }),
        track: vi.fn().mockResolvedValue({}),
        unsubscribe: vi.fn(),
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockUpsertChain as any)
        .mockReturnValue(mockUpdateChain as any);
      mockSupabaseChannel.mockReturnValue(mockChannel as any);

      await presenceService.setUserOnline(mockUser);

      // Fast-forward time to trigger heartbeat
      vi.advanceTimersByTime(30000);

      expect(mockUpdateChain.update).toHaveBeenCalledWith({
        last_seen: expect.any(String)
      });
      expect(mockUpdateChain.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });
  });

  describe('setUserOffline', () => {
    it('should set user offline and cleanup resources', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      const mockDeleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockUpdateChain as any)
        .mockReturnValueOnce(mockDeleteChain as any);

      await presenceService.setUserOffline('user-123');

      expect(mockUpdateChain.update).toHaveBeenCalledWith({
        online: false,
        last_seen: expect.any(String)
      });
      expect(mockDeleteChain.delete).toHaveBeenCalled();
      expect(mockDeleteChain.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('should handle errors gracefully when setting user offline', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockRejectedValue(new Error('Database error'))
      };

      mockSupabaseFrom.mockReturnValue(mockUpdateChain as any);

      // Should not throw error
      await expect(presenceService.setUserOffline('user-123')).resolves.not.toThrow();
    });
  });

  describe('listenToOnlineUsers', () => {
    it('should set up realtime subscription and return unsubscribe function', async () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
      };

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{
            user_id: 'user-123',
            nickname: 'TestUser',
            gender: 'male',
            age: 25,
            country: 'US',
            role: 'standard',
            online: true,
            avatar: '/avatars/standard/male.png',
            joined_at: '2024-01-01T00:00:00Z',
          }],
          error: null
        })
      };

      mockSupabaseChannel.mockReturnValue(mockChannel as any);
      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const callback = vi.fn();
      const unsubscribe = presenceService.listenToOnlineUsers(callback);

      expect(mockSupabaseChannel).toHaveBeenCalledWith('presence-table');
      expect(mockChannel.on).toHaveBeenCalledWith('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'presence'
      }, expect.any(Function));

      // Should call callback with initial users
      await vi.waitFor(() => {
        expect(callback).toHaveBeenCalledWith([
          expect.objectContaining({
            id: 'user-123',
            nickname: 'TestUser',
            online: true,
          })
        ]);
      });

      // Test unsubscribe
      unsubscribe();
      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('updateActivity', () => {
    it('should update user activity with throttling', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom.mockReturnValue(mockUpdateChain as any);

      // First call should update
      presenceService.updateActivity('user-123');
      
      await vi.waitFor(() => {
        expect(mockUpdateChain.update).toHaveBeenCalledWith({
          last_seen: expect.any(String)
        });
      });

      vi.clearAllMocks();

      // Second call within throttle period should be skipped
      presenceService.updateActivity('user-123');
      
      expect(mockUpdateChain.update).not.toHaveBeenCalled();

      // After throttle period, should update again
      vi.advanceTimersByTime(30001);
      presenceService.updateActivity('user-123');

      await vi.waitFor(() => {
        expect(mockUpdateChain.update).toHaveBeenCalled();
      });
    });
  });

  describe('isNicknameOnline', () => {
    it('should return true if nickname is online', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockResolvedValue({
          data: [{ user_id: 'user-123' }],
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await presenceService.isNicknameOnline('TestUser');

      expect(result).toBe(true);
      expect(mockSelectChain.ilike).toHaveBeenCalledWith('nickname', 'TestUser');
    });

    it('should return false if nickname is not online', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await presenceService.isNicknameOnline('TestUser');

      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await presenceService.isNicknameOnline('TestUser');

      expect(result).toBe(false);
    });
  });

  describe('getOnlineCount', () => {
    it('should return online user count', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          count: 5,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await presenceService.getOnlineCount();

      expect(result).toBe(5);
      expect(mockSelectChain.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    });

    it('should return 0 on error', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          count: null,
          error: { message: 'Database error' }
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await presenceService.getOnlineCount();

      expect(result).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should cleanup all resources', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      const mockDeleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockUpdateChain as any)
        .mockReturnValueOnce(mockDeleteChain as any);

      // Set current user
      (presenceService as any).currentUserId = 'user-123';

      presenceService.cleanup();

      // Should call setUserOffline
      expect(mockUpdateChain.update).toHaveBeenCalledWith({
        online: false,
        last_seen: expect.any(String)
      });
    });
  });
});