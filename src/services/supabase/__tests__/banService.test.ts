import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { banService } from '../banService';
import { supabase } from '../../../config/supabase';
import type { Ban, BanCreateRequest } from '../banService';

// Mock supabase
vi.mock('../../../config/supabase', () => ({
  supabase: {
    from: vi.fn(() => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
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
  },
}));

describe('BanService', () => {
  const mockSupabaseFrom = vi.mocked(supabase.from);
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('banUser', () => {
    it('should successfully ban a user with duration', async () => {
      const mockInsertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'ban-123',
            user_id: 'user-123',
            ip_address: null,
            reason: 'Inappropriate behavior',
            duration_hours: 24,
            banned_by: 'admin-123',
            created_at: '2024-01-01T12:00:00Z',
            expires_at: '2024-01-02T12:00:00Z',
            is_active: true
          },
          error: null
        })
      };

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockInsertChain as any) // bans table insert
        .mockReturnValueOnce(mockUpdateChain as any) // users table update
        .mockReturnValueOnce(mockUpdateChain as any); // presence table update

      const result = await banService.banUser('user-123', 'admin-123', 'Inappropriate behavior', 24);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User banned successfully');
      expect(result.data).toHaveProperty('id', 'ban-123');
      expect(mockInsertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          reason: 'Inappropriate behavior',
          duration_hours: 24,
          banned_by: 'admin-123',
          is_active: true
        })
      );
    });

    it('should successfully ban a user permanently', async () => {
      const mockInsertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'ban-123',
            user_id: 'user-123',
            ip_address: null,
            reason: 'Spam',
            duration_hours: null,
            banned_by: 'admin-123',
            created_at: '2024-01-01T12:00:00Z',
            expires_at: null,
            is_active: true
          },
          error: null
        })
      };

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockInsertChain as any)
        .mockReturnValueOnce(mockUpdateChain as any)
        .mockReturnValueOnce(mockUpdateChain as any);

      const result = await banService.banUser('user-123', 'admin-123', 'Spam');

      expect(result.success).toBe(true);
      expect(mockInsertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          duration_hours: null,
          expires_at: null
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      const mockInsertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      };

      mockSupabaseFrom.mockReturnValue(mockInsertChain as any);

      const result = await banService.banUser('user-123', 'admin-123', 'Test');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Database error');
    });
  });

  describe('banIP', () => {
    it('should successfully ban an IP address', async () => {
      const mockInsertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'ban-123',
            user_id: null,
            ip_address: '192.168.1.1',
            reason: 'Malicious activity',
            duration_hours: 48,
            banned_by: 'admin-123',
            created_at: '2024-01-01T12:00:00Z',
            expires_at: '2024-01-03T12:00:00Z',
            is_active: true
          },
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockInsertChain as any);

      const result = await banService.banIP('192.168.1.1', 'admin-123', 'Malicious activity', 48);

      expect(result.success).toBe(true);
      expect(result.message).toBe('IP banned successfully');
      expect(mockInsertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '192.168.1.1',
          user_id: null,
          reason: 'Malicious activity',
          duration_hours: 48
        })
      );
    });
  });

  describe('unbanUser', () => {
    it('should successfully unban a user', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      };
      
      // Mock the final eq call to return success
      mockUpdateChain.eq.mockResolvedValue({ error: null });

      mockSupabaseFrom.mockReturnValue(mockUpdateChain as any);

      const result = await banService.unbanUser('user-123', 'admin-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('User unbanned successfully');
      expect(mockUpdateChain.update).toHaveBeenCalledWith({ is_active: false });
      expect(mockUpdateChain.update).toHaveBeenCalledWith({ status: 'active' });
    });

    it('should handle database errors when unbanning', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      };
      
      // Mock the final eq call to return error
      mockUpdateChain.eq.mockResolvedValue({ error: { message: 'Database error' } });

      mockSupabaseFrom.mockReturnValue(mockUpdateChain as any);

      const result = await banService.unbanUser('user-123', 'admin-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Database error');
    });
  });

  describe('unbanIP', () => {
    it('should successfully unban an IP address', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      };
      
      // Mock the final eq call to return success
      mockUpdateChain.eq.mockResolvedValue({ error: null });

      mockSupabaseFrom.mockReturnValue(mockUpdateChain as any);

      const result = await banService.unbanIP('192.168.1.1', 'admin-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('IP unbanned successfully');
      expect(mockUpdateChain.update).toHaveBeenCalledWith({ is_active: false });
    });
  });

  describe('isUserBanned', () => {
    it('should return true for banned user', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [{
            id: 'ban-123',
            expires_at: '2024-01-02T12:00:00Z'
          }],
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));

      const result = await banService.isUserBanned('user-123');

      expect(result).toBe(true);
    });

    it('should return false for expired ban', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [{
            id: 'ban-123',
            expires_at: '2024-01-01T11:00:00Z' // Expired
          }],
          error: null
        })
      };

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockSelectChain as any) // Check ban
        .mockReturnValueOnce(mockSelectChain as any) // Get ban details
        .mockReturnValueOnce(mockUpdateChain as any) // Update ban status
        .mockReturnValueOnce(mockSelectChain as any) // Check other bans
        .mockReturnValueOnce(mockUpdateChain as any); // Update user status

      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));

      const result = await banService.isUserBanned('user-123');

      expect(result).toBe(false);
    });

    it('should return false for non-banned user', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await banService.isUserBanned('user-123');

      expect(result).toBe(false);
    });
  });

  describe('isIPBanned', () => {
    it('should return true for banned IP', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [{
            id: 'ban-123',
            expires_at: '2024-01-02T12:00:00Z'
          }],
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));

      const result = await banService.isIPBanned('192.168.1.1');

      expect(result).toBe(true);
    });

    it('should return false for non-banned IP', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await banService.isIPBanned('192.168.1.1');

      expect(result).toBe(false);
    });
  });

  describe('getActiveBans', () => {
    it('should return list of active bans with pagination', async () => {
      const mockBans = [
        {
          id: 'ban-1',
          user_id: 'user-1',
          ip_address: null,
          reason: 'Spam',
          duration_hours: 24,
          banned_by: 'admin-123',
          created_at: '2024-01-01T12:00:00Z',
          expires_at: '2024-01-02T12:00:00Z',
          is_active: true
        },
        {
          id: 'ban-2',
          user_id: null,
          ip_address: '192.168.1.1',
          reason: 'Malicious',
          duration_hours: null,
          banned_by: 'admin-123',
          created_at: '2024-01-01T11:00:00Z',
          expires_at: null,
          is_active: true
        }
      ];

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockBans,
          count: 2,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);
      vi.setSystemTime(new Date('2024-01-01T14:00:00Z'));

      const result = await banService.getActiveBans(1, 10);

      expect(result.bans).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.bans[0].id).toBe('ban-1');
      expect(result.bans[1].id).toBe('ban-2');
    });

    it('should handle database errors when getting bans', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: null,
          count: 0,
          error: { message: 'Database error' }
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await banService.getActiveBans();

      expect(result.bans).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getUserBanHistory', () => {
    it('should return ban history for a user', async () => {
      const mockBans = [
        {
          id: 'ban-1',
          user_id: 'user-123',
          ip_address: null,
          reason: 'First offense',
          duration_hours: 24,
          banned_by: 'admin-123',
          created_at: '2024-01-01T12:00:00Z',
          expires_at: '2024-01-02T12:00:00Z',
          is_active: false
        },
        {
          id: 'ban-2',
          user_id: 'user-123',
          ip_address: null,
          reason: 'Second offense',
          duration_hours: null,
          banned_by: 'admin-123',
          created_at: '2024-01-02T12:00:00Z',
          expires_at: null,
          is_active: true
        }
      ];

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockBans,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await banService.getUserBanHistory('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].reason).toBe('First offense');
      expect(result[1].reason).toBe('Second offense');
    });
  });

  describe('getIPBanHistory', () => {
    it('should return ban history for an IP', async () => {
      const mockBans = [
        {
          id: 'ban-1',
          user_id: null,
          ip_address: '192.168.1.1',
          reason: 'Malicious activity',
          duration_hours: 48,
          banned_by: 'admin-123',
          created_at: '2024-01-01T12:00:00Z',
          expires_at: '2024-01-03T12:00:00Z',
          is_active: true
        }
      ];

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockBans,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await banService.getIPBanHistory('192.168.1.1');

      expect(result).toHaveLength(1);
      expect(result[0].ipAddress).toBe('192.168.1.1');
      expect(result[0].reason).toBe('Malicious activity');
    });
  });

  describe('banMultipleUsers', () => {
    it('should ban multiple users and return results', async () => {
      const mockInsertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'ban-123',
            user_id: 'user-123',
            ip_address: null,
            reason: 'Bulk ban',
            duration_hours: 24,
            banned_by: 'admin-123',
            created_at: '2024-01-01T12:00:00Z',
            expires_at: '2024-01-02T12:00:00Z',
            is_active: true
          },
          error: null
        })
      };

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom.mockReturnValue(mockInsertChain as any);

      const userIds = ['user-1', 'user-2', 'user-3'];
      const results = await banService.banMultipleUsers(userIds, 'admin-123', 'Bulk ban', 24);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('getBanStatistics', () => {
    it('should return ban statistics', async () => {
      // Mock each Promise.all call to return count: 5
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          count: 5,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await banService.getBanStatistics();

      expect(result.totalActiveBans).toBe(5);
      expect(result.userBans).toBe(5);
      expect(result.ipBans).toBe(5);
      expect(result.permanentBans).toBe(5);
      expect(result.temporaryBans).toBe(5);
    });

    it('should handle database errors when getting statistics', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          count: null,
          error: { message: 'Database error' }
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await banService.getBanStatistics();

      expect(result).toEqual({
        totalActiveBans: 0,
        userBans: 0,
        ipBans: 0,
        permanentBans: 0,
        temporaryBans: 0
      });
    });
  });
});