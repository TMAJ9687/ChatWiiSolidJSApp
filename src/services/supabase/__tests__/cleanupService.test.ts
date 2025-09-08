import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanupService } from '../cleanupService';
import { supabase } from '../../../config/supabase';
import type { CleanupStats, CleanupResult, CleanupLog } from '../cleanupService';

// Mock supabase
vi.mock('../../../config/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
    })),
  },
}));

describe('CleanupService', () => {
  const mockSupabaseRpc = vi.mocked(supabase.rpc);
  const mockSupabaseFrom = vi.mocked(supabase.from);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAnonymousUserStats', () => {
    it('should return anonymous user statistics', async () => {
      const mockStats = [{
        total_anonymous_users: '100',
        active_anonymous_users: '75',
        inactive_for_1h_plus: '20',
        ready_for_cleanup: '5'
      }];

      mockSupabaseRpc.mockResolvedValue({
        data: mockStats,
        error: null
      });

      const result = await cleanupService.getAnonymousUserStats();

      expect(result).toEqual({
        totalAnonymousUsers: 100,
        activeAnonymousUsers: 75,
        inactiveFor1HPlus: 20,
        readyForCleanup: 5
      });
      expect(mockSupabaseRpc).toHaveBeenCalledWith('get_anonymous_user_stats');
    });

    it('should handle database error gracefully', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await cleanupService.getAnonymousUserStats();

      expect(result).toEqual({
        totalAnonymousUsers: 0,
        activeAnonymousUsers: 0,
        inactiveFor1HPlus: 0,
        readyForCleanup: 0
      });
    });

    it('should handle empty response', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await cleanupService.getAnonymousUserStats();

      expect(result).toEqual({
        totalAnonymousUsers: 0,
        activeAnonymousUsers: 0,
        inactiveFor1HPlus: 0,
        readyForCleanup: 0
      });
    });
  });

  describe('dryRunCleanup', () => {
    it('should perform dry run cleanup successfully', async () => {
      const mockResult = [{
        action: 'DRY RUN',
        count: '5',
        details: 'Would delete 5 inactive users'
      }];

      mockSupabaseRpc.mockResolvedValue({
        data: mockResult,
        error: null
      });

      const result = await cleanupService.dryRunCleanup();

      expect(result).toEqual({
        action: 'DRY RUN',
        count: 5,
        details: 'Would delete 5 inactive users'
      });
      expect(mockSupabaseRpc).toHaveBeenCalledWith('safe_cleanup_anonymous_users', { dry_run: true });
    });

    it('should handle dry run error', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: { message: 'Function not found' }
      });

      const result = await cleanupService.dryRunCleanup();

      expect(result).toEqual({
        action: 'ERROR',
        count: 0,
        details: 'Error: Function not found'
      });
    });
  });

  describe('executeCleanup', () => {
    it('should execute cleanup successfully', async () => {
      const mockResult = [{
        action: 'CLEANUP EXECUTED',
        count: '3',
        details: 'Deleted 3 inactive users'
      }];

      mockSupabaseRpc.mockResolvedValue({
        data: mockResult,
        error: null
      });

      const result = await cleanupService.executeCleanup();

      expect(result).toEqual({
        action: 'CLEANUP EXECUTED',
        count: 3,
        details: 'Deleted 3 inactive users'
      });
      expect(mockSupabaseRpc).toHaveBeenCalledWith('safe_cleanup_anonymous_users', { dry_run: false });
    });

    it('should throw error on cleanup failure', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: { message: 'Cleanup failed' }
      });

      await expect(cleanupService.executeCleanup()).rejects.toThrow('Cleanup failed');
    });
  });

  describe('executeCleanupWithLogging', () => {
    it('should execute cleanup with logging successfully', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: null
      });

      await expect(cleanupService.executeCleanupWithLogging()).resolves.not.toThrow();
      expect(mockSupabaseRpc).toHaveBeenCalledWith('cleanup_anonymous_users_with_logging');
    });

    it('should throw error on logging cleanup failure', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: { message: 'Logging failed' }
      });

      await expect(cleanupService.executeCleanupWithLogging()).rejects.toThrow('Logging failed');
    });
  });

  describe('getCleanupLogs', () => {
    it('should retrieve cleanup logs successfully', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          operation: 'MANUAL_CLEANUP',
          users_affected: 5,
          details: 'Cleaned up 5 users',
          executed_at: '2024-01-01T12:00:00Z'
        },
        {
          id: 'log-2',
          operation: 'AUTO_CLEANUP',
          users_affected: 2,
          details: 'Cleaned up 2 users',
          executed_at: '2024-01-01T11:00:00Z'
        }
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockLogs,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockChain as any);

      const result = await cleanupService.getCleanupLogs(10);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'log-1',
        operation: 'MANUAL_CLEANUP',
        usersAffected: 5,
        details: 'Cleaned up 5 users',
        executedAt: '2024-01-01T12:00:00Z'
      });
      expect(mockChain.limit).toHaveBeenCalledWith(10);
    });

    it('should handle logs retrieval error', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      };

      mockSupabaseFrom.mockReturnValue(mockChain as any);

      const result = await cleanupService.getCleanupLogs();

      expect(result).toEqual([]);
    });
  });

  describe('isAutomaticCleanupActive', () => {
    it('should return true when recent cleanup activity exists', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [{ id: 'log-1' }],
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockChain as any);

      const result = await cleanupService.isAutomaticCleanupActive();

      expect(result).toBe(true);
      expect(mockChain.gte).toHaveBeenCalledWith('executed_at', expect.any(String));
    });

    it('should return false when no recent activity', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockChain as any);

      const result = await cleanupService.isAutomaticCleanupActive();

      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      };

      mockSupabaseFrom.mockReturnValue(mockChain as any);

      const result = await cleanupService.isAutomaticCleanupActive();

      expect(result).toBe(false);
    });
  });

  describe('manualCleanup', () => {
    it('should perform manual cleanup successfully', async () => {
      // Mock dry run
      mockSupabaseRpc
        .mockResolvedValueOnce({
          data: [{ action: 'DRY RUN', count: '3', details: 'Would delete 3 users' }],
          error: null
        })
        // Mock actual cleanup
        .mockResolvedValueOnce({
          data: [{ action: 'CLEANUP EXECUTED', count: '3', details: 'Deleted 3 users' }],
          error: null
        })
        // Mock logging
        .mockResolvedValueOnce({
          data: null,
          error: null
        });

      const result = await cleanupService.manualCleanup();

      expect(result.success).toBe(true);
      expect(result.result.count).toBe(3);
      expect(result.result.action).toBe('CLEANUP EXECUTED');
      expect(mockSupabaseRpc).toHaveBeenCalledTimes(3);
    });

    it('should return no action needed when no users to cleanup', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: [{ action: 'DRY RUN', count: '0', details: 'No users to cleanup' }],
        error: null
      });

      const result = await cleanupService.manualCleanup();

      expect(result.success).toBe(true);
      expect(result.result.action).toBe('NO ACTION NEEDED');
      expect(result.result.count).toBe(0);
    });

    it('should handle manual cleanup error', async () => {
      mockSupabaseRpc.mockRejectedValue(new Error('Cleanup failed'));

      const result = await cleanupService.manualCleanup();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cleanup failed');
      expect(result.result.action).toBe('ERROR');
    });
  });

  describe('getCleanupSummary', () => {
    it('should return comprehensive cleanup summary', async () => {
      const mockStats = [{
        total_anonymous_users: '100',
        active_anonymous_users: '75',
        inactive_for_1h_plus: '20',
        ready_for_cleanup: '5'
      }];

      const mockLogs = [{
        id: 'log-1',
        operation: 'MANUAL_CLEANUP',
        users_affected: 5,
        details: 'Cleaned up 5 users',
        executed_at: '2024-01-01T12:00:00Z'
      }];

      mockSupabaseRpc.mockResolvedValue({
        data: mockStats,
        error: null
      });

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [{ id: 'log-1' }],
            error: null
          })
        }).mockResolvedValueOnce({
          data: mockLogs,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockChain as any);

      const result = await cleanupService.getCleanupSummary();

      expect(result.stats.totalAnonymousUsers).toBe(100);
      expect(result.recentActivity).toHaveLength(1);
      expect(result.lastCleanup?.id).toBe('log-1');
      expect(result.isAutomaticActive).toBe(true);
    });
  });

  describe('enableAutomaticCleanup', () => {
    it('should enable automatic cleanup successfully', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await cleanupService.enableAutomaticCleanup();

      expect(result.success).toBe(true);
      expect(result.message).toContain('enabled');
      expect(mockSupabaseRpc).toHaveBeenCalledWith('cron.schedule', {
        job_name: 'cleanup-anonymous-users',
        cron_expression: '0 * * * *',
        sql_command: 'SELECT cleanup_anonymous_users_with_logging();'
      });
    });

    it('should handle enable error', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: { message: 'Cron not available' }
      });

      const result = await cleanupService.enableAutomaticCleanup();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to enable');
    });
  });

  describe('disableAutomaticCleanup', () => {
    it('should disable automatic cleanup successfully', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await cleanupService.disableAutomaticCleanup();

      expect(result.success).toBe(true);
      expect(result.message).toContain('disabled');
      expect(mockSupabaseRpc).toHaveBeenCalledWith('cron.unschedule', {
        job_name: 'cleanup-anonymous-users'
      });
    });

    it('should handle disable error', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: { message: 'Job not found' }
      });

      const result = await cleanupService.disableAutomaticCleanup();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to disable');
    });
  });
});