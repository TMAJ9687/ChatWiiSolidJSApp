import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { userStatusService } from '../userStatusService';
import { supabase } from '../../../config/supabase';
import type { UserStatusUpdate, PresenceUpdate } from '../userStatusService';

// Mock supabase
vi.mock('../../../config/supabase', () => ({
  supabase: {
    from: vi.fn(() => {
      const mockChain = {
        update: vi.fn(() => ({
          eq: vi.fn(() => ({ error: null }))
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: null }))
          })),
          order: vi.fn(() => ({ data: [], error: null })),
          limit: vi.fn(() => ({ error: null }))
        }))
      };
      return mockChain;
    }),
    channel: vi.fn(() => {
      const mockChannel = {
        send: vi.fn(() => ({ error: null })),
        on: vi.fn(() => mockChannel),
        subscribe: vi.fn(() => mockChannel)
      };
      return mockChannel;
    }),
    removeChannel: vi.fn()
  }
}));

describe('UserStatusService', () => {
  const mockUserId = 'test-user-id';
  const mockAdminId = 'test-admin-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    userStatusService.cleanup();
  });

  describe('broadcastUserStatusUpdate', () => {
    it('should broadcast user status update successfully', async () => {
      const update: UserStatusUpdate = {
        userId: mockUserId,
        status: 'kicked',
        online: false,
        kickedAt: new Date().toISOString(),
        kickReason: 'Test reason',
        timestamp: new Date().toISOString()
      };

      const mockSend = vi.fn().mockResolvedValue({ error: null });
      const mockChannel = {
        send: mockSend
      };
      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

      await userStatusService.broadcastUserStatusUpdate(update);

      expect(supabase.channel).toHaveBeenCalledWith('user_status_updates');
      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'user_status_changed',
        payload: update
      });
    });

    it('should handle broadcast errors gracefully', async () => {
      const update: UserStatusUpdate = {
        userId: mockUserId,
        status: 'active',
        online: true,
        timestamp: new Date().toISOString()
      };

      const mockSend = vi.fn().mockResolvedValue({ error: new Error('Broadcast failed') });
      const mockChannel = {
        send: mockSend
      };
      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

      // Should not throw error
      await expect(userStatusService.broadcastUserStatusUpdate(update)).resolves.toBeUndefined();
    });
  });

  describe('broadcastPresenceUpdate', () => {
    it('should broadcast presence update successfully', async () => {
      const update: PresenceUpdate = {
        userId: mockUserId,
        online: true,
        lastSeen: new Date().toISOString()
      };

      const mockSend = vi.fn().mockResolvedValue({ error: null });
      const mockChannel = {
        send: mockSend
      };
      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

      await userStatusService.broadcastPresenceUpdate(update);

      expect(supabase.channel).toHaveBeenCalledWith('presence_updates');
      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'presence_changed',
        payload: update
      });
    });
  });

  describe('subscribeToUserStatusUpdates', () => {
    it('should subscribe to user status updates', () => {
      const mockCallback = vi.fn();
      const mockChannel = {
        on: vi.fn(() => mockChannel),
        subscribe: vi.fn(() => mockChannel)
      };
      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

      const unsubscribe = userStatusService.subscribeToUserStatusUpdates(mockCallback);

      expect(supabase.channel).toHaveBeenCalled();
      expect(mockChannel.on).toHaveBeenCalledWith(
        'broadcast',
        { event: 'user_status_changed' },
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should call callback when status update is received', () => {
      const mockCallback = vi.fn();
      let statusUpdateHandler: (payload: any) => void;

      const mockChannel = {
        on: vi.fn((type, config, handler) => {
          statusUpdateHandler = handler;
          return mockChannel;
        }),
        subscribe: vi.fn(() => mockChannel)
      };
      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

      userStatusService.subscribeToUserStatusUpdates(mockCallback);

      const testUpdate: UserStatusUpdate = {
        userId: mockUserId,
        status: 'banned',
        online: false,
        timestamp: new Date().toISOString()
      };

      // Simulate receiving a status update
      statusUpdateHandler!({ payload: testUpdate });

      expect(mockCallback).toHaveBeenCalledWith(testUpdate);
    });
  });

  describe('updateUserStatus', () => {
    it('should update user status to kicked', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      await userStatusService.updateUserStatus(mockUserId, 'kicked', {
        kickReason: 'Test kick',
        updatedBy: mockAdminId
      });

      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'kicked',
          kicked_at: expect.any(String),
          kick_reason: 'Test kick',
          is_kicked: true,
          online: false
        })
      );
      expect(mockEq).toHaveBeenCalledWith('id', mockUserId);
    });

    it('should update user status to banned', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const banExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await userStatusService.updateUserStatus(mockUserId, 'banned', {
        banReason: 'Test ban',
        banExpiresAt,
        updatedBy: mockAdminId
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'banned',
          ban_reason: 'Test ban',
          ban_expires_at: banExpiresAt,
          is_banned: true,
          online: false
        })
      );
    });

    it('should update user status to active', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      await userStatusService.updateUserStatus(mockUserId, 'active');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          kicked_at: null,
          kick_reason: null,
          is_kicked: false,
          ban_reason: null,
          ban_expires_at: null,
          is_banned: false
        })
      );
    });

    it('should handle database errors', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: new Error('Database error') });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      await expect(
        userStatusService.updateUserStatus(mockUserId, 'kicked')
      ).rejects.toThrow('Database error');
    });
  });

  describe('getUserStatus', () => {
    it('should get user status successfully', async () => {
      const mockUserData = {
        id: mockUserId,
        status: 'active',
        online: true,
        last_seen: new Date().toISOString(),
        kicked_at: null,
        kick_reason: null,
        ban_expires_at: null,
        ban_reason: null,
        is_kicked: false,
        is_banned: false,
        updated_at: new Date().toISOString()
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockUserData, error: null });
      const mockSelect = vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) }));
      const mockFrom = vi.fn(() => ({ select: mockSelect }));
      vi.mocked(supabase.from).mockReturnValue(mockFrom() as any);

      const result = await userStatusService.getUserStatus(mockUserId);

      expect(result).toEqual({
        userId: mockUserId,
        status: 'active',
        online: true,
        lastSeen: mockUserData.last_seen,
        kickedAt: null,
        kickReason: null,
        banExpiresAt: null,
        banReason: null,
        timestamp: mockUserData.updated_at
      });
    });

    it('should return null when user not found', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') });
      const mockSelect = vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) }));
      const mockFrom = vi.fn(() => ({ select: mockSelect }));
      vi.mocked(supabase.from).mockReturnValue(mockFrom() as any);

      const result = await userStatusService.getUserStatus(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('getAllUsersStatus', () => {
    it('should get all users status successfully', async () => {
      const mockUsersData = [
        {
          id: 'user1',
          status: 'active',
          online: true,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'user2',
          status: 'kicked',
          online: false,
          kicked_at: new Date().toISOString(),
          kick_reason: 'Test reason',
          updated_at: new Date().toISOString()
        }
      ];

      const mockOrder = vi.fn().mockResolvedValue({ data: mockUsersData, error: null });
      const mockSelect = vi.fn(() => ({ order: mockOrder }));
      const mockFrom = vi.fn(() => ({ select: mockSelect }));
      vi.mocked(supabase.from).mockReturnValue(mockFrom() as any);

      const result = await userStatusService.getAllUsersStatus();

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('user1');
      expect(result[0].status).toBe('active');
      expect(result[1].userId).toBe('user2');
      expect(result[1].status).toBe('kicked');
    });

    it('should handle database errors', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') });
      const mockSelect = vi.fn(() => ({ order: mockOrder }));
      const mockFrom = vi.fn(() => ({ select: mockSelect }));
      vi.mocked(supabase.from).mockReturnValue(mockFrom() as any);

      const result = await userStatusService.getAllUsersStatus();

      expect(result).toEqual([]);
    });
  });

  describe('cleanup', () => {
    it('should cleanup all subscriptions', () => {
      const mockCallback = vi.fn();
      const mockUnsubscribe = vi.fn();
      
      // Mock subscription creation
      const mockChannel = {
        on: vi.fn(() => mockChannel),
        subscribe: vi.fn(() => mockChannel)
      };
      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);
      vi.mocked(supabase.removeChannel).mockImplementation(() => {
        mockUnsubscribe();
      });

      // Create some subscriptions
      userStatusService.subscribeToUserStatusUpdates(mockCallback, 'test1');
      userStatusService.subscribeToPresenceUpdates(mockCallback, 'test2');

      // Cleanup
      userStatusService.cleanup();

      // Should have called removeChannel for each subscription
      expect(supabase.removeChannel).toHaveBeenCalled();
    });
  });

  describe('connection management', () => {
    it('should handle connection loss', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // Mock successful reconnection
      const mockLimit = vi.fn().mockResolvedValue({ error: null });
      const mockSelect = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      await userStatusService.handleConnectionLoss();

      expect(consoleSpy).toHaveBeenCalledWith("Connection lost, attempting to reconnect...");
      
      consoleSpy.mockRestore();
    }, 10000); // Increase timeout

    it('should monitor connection status', () => {
      const mockChannel = {
        on: vi.fn(() => mockChannel),
        subscribe: vi.fn(() => mockChannel)
      };
      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

      const unsubscribe = userStatusService.monitorConnection();

      expect(supabase.channel).toHaveBeenCalledWith('connection_monitor');
      expect(mockChannel.on).toHaveBeenCalledWith('system', {}, expect.any(Function));
      expect(typeof unsubscribe).toBe('function');
    });
  });
});