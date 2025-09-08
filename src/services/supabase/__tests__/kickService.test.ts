import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { kickService } from '../kickService';
import { supabase } from '../../../config/supabase';
import type { KickNotification, KickStatus } from '../kickService';

// Mock supabase
vi.mock('../../../config/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      };
      // Make all methods return resolved promises by default
      Object.keys(mockChain).forEach(key => {
        if (key !== 'mockReturnThis') {
          const originalMethod = mockChain[key as keyof typeof mockChain];
          if (typeof originalMethod === 'function' && key !== 'single') {
            mockChain[key as keyof typeof mockChain] = vi.fn().mockReturnValue(mockChain);
          }
        }
      });
      return mockChain;
    }),
    channel: vi.fn(() => ({
      send: vi.fn().mockResolvedValue({ error: null }),
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({}),
    })),
    removeChannel: vi.fn(),
  },
}));

describe('KickService', () => {
  const mockSupabaseRpc = vi.mocked(supabase.rpc);
  const mockSupabaseFrom = vi.mocked(supabase.from);
  const mockSupabaseChannel = vi.mocked(supabase.channel);
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('kickUser', () => {
    it('should successfully kick a user', async () => {
      // Mock the RPC function call
      mockSupabaseRpc.mockResolvedValue({
        data: { success: true, message: 'User kicked successfully' },
        error: null
      });

      const mockUpsertChain = {
        upsert: vi.fn().mockResolvedValue({ error: null })
      };

      const mockChannelChain = {
        send: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom.mockReturnValue(mockUpsertChain as any); // kick status upsert
      mockSupabaseChannel.mockReturnValue(mockChannelChain as any);

      const result = await kickService.kickUser('user-123', 'admin-123', 'Inappropriate behavior');

      expect(result.success).toBe(true);
      expect(result.message).toBe('User kicked successfully');
      expect(result.data).toHaveProperty('userId', 'user-123');
      expect(mockSupabaseRpc).toHaveBeenCalledWith('admin_kick_user_transaction', {
        p_user_id: 'user-123',
        p_admin_id: 'admin-123',
        p_reason: 'Inappropriate behavior',
        p_expires_at: expect.any(String)
      });
      expect(mockChannelChain.send).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Mock RPC function returning an error
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await kickService.kickUser('user-123', 'admin-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Database error');
    });

    it('should set kick expiry to 24 hours', async () => {
      // Mock the RPC function call
      mockSupabaseRpc.mockResolvedValue({
        data: { success: true, message: 'User kicked successfully' },
        error: null
      });

      const mockUpsertChain = {
        upsert: vi.fn().mockResolvedValue({ error: null })
      };

      const mockChannelChain = {
        send: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom.mockReturnValue(mockUpsertChain as any);
      mockSupabaseChannel.mockReturnValue(mockChannelChain as any);

      const now = new Date('2024-01-01T12:00:00Z');
      vi.setSystemTime(now);

      const result = await kickService.kickUser('user-123', 'admin-123');

      expect(result.success).toBe(true);
      expect(mockSupabaseRpc).toHaveBeenCalledWith('admin_kick_user_transaction', {
        p_user_id: 'user-123',
        p_admin_id: 'admin-123',
        p_reason: 'No reason provided',
        p_expires_at: '2024-01-02T12:00:00.000Z' // 24 hours later
      });
    });
  });

  describe('getKickStatus', () => {
    it('should return kick status from database', async () => {
      const mockKickData = {
        user_id: 'user-123',
        is_kicked: true,
        kicked_at: '2024-01-01T12:00:00Z',
        kicked_by: 'admin-123',
        reason: 'Test reason',
        expires_at: '2024-01-02T12:00:00Z'
      };

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockKickData, error: null })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);
      
      // Set time to before expiry
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));

      const result = await kickService.getKickStatus('user-123');

      expect(result).toEqual({
        userId: 'user-123',
        isKicked: true,
        kickedAt: '2024-01-01T12:00:00Z',
        kickedBy: 'admin-123',
        reason: 'Test reason',
        expiresAt: '2024-01-02T12:00:00Z'
      });
    });

    it('should return null for expired kick', async () => {
      const expiredKickData = {
        user_id: 'user-123',
        is_kicked: true,
        kicked_at: '2024-01-01T12:00:00Z',
        kicked_by: 'admin-123',
        reason: 'Test reason',
        expires_at: '2024-01-01T11:00:00Z' // Expired
      };

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: expiredKickData, error: null })
      };

      const mockDeleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockSelectChain as any) // get kick status
        .mockReturnValueOnce(mockDeleteChain as any) // delete expired kick
        .mockReturnValueOnce(mockSelectChain as any) // get user status
        .mockReturnValueOnce(mockSelectChain as any); // update user status

      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));

      const result = await kickService.getKickStatus('user-123');

      expect(result).toBeNull();
      expect(mockDeleteChain.delete).toHaveBeenCalled();
    });

    it('should return null when no kick status exists', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await kickService.getKickStatus('user-123');

      expect(result).toBeNull();
    });
  });

  describe('isUserKicked', () => {
    it('should return true for kicked user', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            user_id: 'user-123',
            is_kicked: true,
            expires_at: '2024-01-02T12:00:00Z'
          },
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));

      const result = await kickService.isUserKicked('user-123');

      expect(result).toBe(true);
    });

    it('should return false for non-kicked user', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await kickService.isUserKicked('user-123');

      expect(result).toBe(false);
    });
  });

  describe('clearKickStatus', () => {
    it('should clear kick status and restore user to active', async () => {
      const mockDeleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { status: 'kicked' },
          error: null
        })
      };

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockDeleteChain as any) // delete kick status
        .mockReturnValueOnce(mockSelectChain as any) // get user status
        .mockReturnValueOnce(mockUpdateChain as any); // update user status

      await kickService.clearKickStatus('user-123');

      expect(mockDeleteChain.delete).toHaveBeenCalled();
      expect(mockUpdateChain.update).toHaveBeenCalledWith({ status: 'active' });
    });

    it('should not update user status if user is banned', async () => {
      const mockDeleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { status: 'banned' },
          error: null
        })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockDeleteChain as any)
        .mockReturnValueOnce(mockSelectChain as any);

      await kickService.clearKickStatus('user-123');

      expect(mockDeleteChain.delete).toHaveBeenCalled();
      // Should not call update since user is banned, not kicked
      expect(mockSupabaseFrom).toHaveBeenCalledTimes(2);
    });
  });

  describe('kickMultipleUsers', () => {
    it('should kick multiple users and return results', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      const mockUpsertChain = {
        upsert: vi.fn().mockResolvedValue({ error: null })
      };

      const mockChannelChain = {
        send: vi.fn().mockResolvedValue({ error: null })
      };

      // Mock multiple calls for each user kick operation
      mockSupabaseFrom.mockReturnValue(mockUpdateChain as any);
      mockSupabaseChannel.mockReturnValue(mockChannelChain as any);

      const userIds = ['user-1', 'user-2', 'user-3'];
      const results = await kickService.kickMultipleUsers(userIds, 'admin-123', 'Bulk kick');

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('getKickedUsers', () => {
    it('should return list of currently kicked users', async () => {
      const mockKickedUsers = [
        {
          user_id: 'user-1',
          is_kicked: true,
          kicked_at: '2024-01-01T12:00:00Z',
          kicked_by: 'admin-123',
          reason: 'Reason 1',
          expires_at: '2024-01-02T12:00:00Z'
        },
        {
          user_id: 'user-2',
          is_kicked: true,
          kicked_at: '2024-01-01T13:00:00Z',
          kicked_by: 'admin-123',
          reason: 'Reason 2',
          expires_at: '2024-01-02T13:00:00Z'
        }
      ];

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockKickedUsers, error: null })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);
      vi.setSystemTime(new Date('2024-01-01T14:00:00Z'));

      const result = await kickService.getKickedUsers();

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('user-1');
      expect(result[1].userId).toBe('user-2');
    });

    it('should filter out expired kicks', async () => {
      const mockKickedUsers = [
        {
          user_id: 'user-1',
          is_kicked: true,
          kicked_at: '2024-01-01T12:00:00Z',
          kicked_by: 'admin-123',
          reason: 'Reason 1',
          expires_at: '2024-01-02T12:00:00Z' // Valid
        },
        {
          user_id: 'user-2',
          is_kicked: true,
          kicked_at: '2024-01-01T10:00:00Z',
          kicked_by: 'admin-123',
          reason: 'Reason 2',
          expires_at: '2024-01-01T11:00:00Z' // Expired
        }
      ];

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockKickedUsers, error: null })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);
      vi.setSystemTime(new Date('2024-01-01T14:00:00Z'));

      const result = await kickService.getKickedUsers();

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-1');
    });
  });

  describe('subscribeToKickNotifications', () => {
    it('should set up subscription and return unsubscribe function', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({})
      };

      mockSupabaseChannel.mockReturnValue(mockChannel as any);

      const onKicked = vi.fn();
      const unsubscribe = kickService.subscribeToKickNotifications('user-123', onKicked);

      expect(mockSupabaseChannel).toHaveBeenCalledWith('kick_notifications_user-123');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'broadcast',
        { event: 'user_kicked' },
        expect.any(Function)
      );
      expect(typeof unsubscribe).toBe('function');
    });

    it('should call onKicked when notification is received for target user', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({})
      };

      let broadcastHandler: (payload: any) => void;
      mockChannel.on.mockImplementation((type, config, handler) => {
        broadcastHandler = handler;
        return mockChannel;
      });

      mockSupabaseChannel.mockReturnValue(mockChannel as any);

      const onKicked = vi.fn();
      kickService.subscribeToKickNotifications('user-123', onKicked);

      // Simulate receiving a kick notification
      const notification = {
        payload: {
          targetUserId: 'user-123',
          userId: 'user-123',
          reason: 'Test kick',
          kickedBy: 'admin-123',
          kickedAt: '2024-01-01T12:00:00Z'
        }
      };

      broadcastHandler!(notification);

      expect(onKicked).toHaveBeenCalledWith(notification.payload);
    });

    it('should not call onKicked for different user', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({})
      };

      let broadcastHandler: (payload: any) => void;
      mockChannel.on.mockImplementation((type, config, handler) => {
        broadcastHandler = handler;
        return mockChannel;
      });

      mockSupabaseChannel.mockReturnValue(mockChannel as any);

      const onKicked = vi.fn();
      kickService.subscribeToKickNotifications('user-123', onKicked);

      // Simulate receiving a kick notification for different user
      const notification = {
        payload: {
          targetUserId: 'user-456',
          userId: 'user-456',
          reason: 'Test kick',
          kickedBy: 'admin-123',
          kickedAt: '2024-01-01T12:00:00Z'
        }
      };

      broadcastHandler!(notification);

      expect(onKicked).not.toHaveBeenCalled();
    });
  });
});