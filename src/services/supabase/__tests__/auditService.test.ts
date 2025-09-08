import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { auditService, AuditLogEntry, AuditLogFilter } from '../auditService';
import { supabase } from '../../../config/supabase';
import { databaseService } from '../databaseService';

// Mock dependencies
vi.mock('../../../config/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          ilike: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                range: vi.fn(() => ({
                  order: vi.fn()
                }))
              }))
            }))
          }))
        })),
        or: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                range: vi.fn(() => ({
                  order: vi.fn()
                }))
              }))
            }))
          }))
        })),
        delete: vi.fn(() => ({
          lt: vi.fn(() => ({
            select: vi.fn()
          }))
        }))
      }))
    })),
    rpc: vi.fn()
  }
}));

vi.mock('../databaseService', () => ({
  databaseService: {
    createTransaction: vi.fn(),
    addOperation: vi.fn(),
    commitTransaction: vi.fn(),
    rollbackTransaction: vi.fn()
  }
}));

describe('AuditService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logAction', () => {
    it('should log an admin action successfully', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      (supabase.from as any).mockReturnValue({
        insert: mockInsert
      });

      await auditService.logAction(
        'admin-123',
        'user_kick',
        'user',
        'user-456',
        { reason: 'spam' },
        { ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0' }
      );

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          admin_id: 'admin-123',
          action: 'user_kick',
          target_type: 'user',
          target_id: 'user-456',
          details: { reason: 'spam' },
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0'
        })
      );
    });

    it('should handle logging errors gracefully', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ 
        error: { message: 'Database error' }
      });
      (supabase.from as any).mockReturnValue({
        insert: mockInsert
      });

      // Should not throw error
      await expect(
        auditService.logAction('admin-123', 'user_kick', 'user', 'user-456')
      ).resolves.not.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        'Failed to log audit entry:',
        { message: 'Database error' }
      );
    });
  });

  describe('logBulkActions', () => {
    it('should log multiple actions in a transaction', async () => {
      const mockTransactionId = 'tx-123';
      (databaseService.createTransaction as any).mockResolvedValue(mockTransactionId);
      (databaseService.commitTransaction as any).mockResolvedValue(undefined);

      const actions = [
        { action: 'user_kick', targetType: 'user' as const, targetId: 'user-1' },
        { action: 'user_ban', targetType: 'user' as const, targetId: 'user-2' }
      ];

      await auditService.logBulkActions('admin-123', actions);

      expect(databaseService.createTransaction).toHaveBeenCalled();
      expect(databaseService.addOperation).toHaveBeenCalledTimes(2);
      expect(databaseService.commitTransaction).toHaveBeenCalledWith(mockTransactionId);
    });

    it('should rollback transaction on error', async () => {
      const mockTransactionId = 'tx-123';
      (databaseService.createTransaction as any).mockResolvedValue(mockTransactionId);
      (databaseService.commitTransaction as any).mockRejectedValue(new Error('Transaction failed'));

      const actions = [
        { action: 'user_kick', targetType: 'user' as const, targetId: 'user-1' }
      ];

      await auditService.logBulkActions('admin-123', actions);

      expect(databaseService.rollbackTransaction).toHaveBeenCalledWith(mockTransactionId);
      expect(console.error).toHaveBeenCalledWith(
        'Bulk audit logging failed:',
        expect.any(Error)
      );
    });
  });

  describe('getAuditLogs', () => {
    it('should fetch audit logs with filters', async () => {
      const mockData = [
        {
          id: 'log-1',
          admin_id: 'admin-123',
          action: 'user_kick',
          target_type: 'user',
          target_id: 'user-456',
          details: { reason: 'spam' },
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null, count: 1 })
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      });

      const filter: AuditLogFilter = {
        adminId: 'admin-123',
        action: 'kick',
        targetType: 'user',
        dateFrom: '2023-01-01',
        dateTo: '2023-01-31',
        limit: 10,
        offset: 0
      };

      const result = await auditService.getAuditLogs(filter);

      expect(result.entries).toEqual(mockData);
      expect(result.totalCount).toBe(1);
      expect(mockQuery.eq).toHaveBeenCalledWith('admin_id', 'admin-123');
      expect(mockQuery.ilike).toHaveBeenCalledWith('action', '%kick%');
      expect(mockQuery.eq).toHaveBeenCalledWith('target_type', 'user');
    });

    it('should handle database errors', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Database error' }, 
          count: null 
        })
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      });

      await expect(auditService.getAuditLogs()).rejects.toThrow('Failed to fetch audit logs: Database error');
    });
  });

  describe('getTargetAuditHistory', () => {
    it('should fetch audit history for a specific target', async () => {
      const mockData = [
        {
          id: 'log-1',
          action: 'user_kick',
          target_type: 'user',
          target_id: 'user-456',
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null })
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      });

      const result = await auditService.getTargetAuditHistory('user', 'user-456');

      expect(result).toEqual(mockData);
      expect(mockQuery.eq).toHaveBeenCalledWith('target_type', 'user');
      expect(mockQuery.eq).toHaveBeenCalledWith('target_id', 'user-456');
    });
  });

  describe('getAdminActivitySummary', () => {
    it('should return admin activity summary', async () => {
      const mockData = [
        { action: 'user_kick', created_at: '2023-01-01T00:00:00Z', target_type: 'user', details: {} },
        { action: 'user_ban', created_at: '2023-01-02T00:00:00Z', target_type: 'user', details: {} },
        { action: 'user_kick', created_at: '2023-01-03T00:00:00Z', target_type: 'user', details: {} }
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null })
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      });

      const result = await auditService.getAdminActivitySummary('admin-123');

      expect(result.totalActions).toBe(3);
      expect(result.actionsByType).toEqual({
        'user_kick': 2,
        'user_ban': 1
      });
      expect(result.recentActions).toHaveLength(3);
    });
  });

  describe('exportAuditLogs', () => {
    it('should export audit logs as JSON', async () => {
      const mockData = [
        {
          id: 'log-1',
          adminId: 'admin-123',
          action: 'user_kick',
          targetType: 'user',
          targetId: 'user-456',
          details: { reason: 'spam' },
          createdAt: '2023-01-01T00:00:00Z'
        }
      ];

      // Mock getAuditLogs method
      vi.spyOn(auditService, 'getAuditLogs').mockResolvedValue({
        entries: mockData as AuditLogEntry[],
        totalCount: 1
      });

      // Mock logAction method
      vi.spyOn(auditService, 'logAction').mockResolvedValue();

      const result = await auditService.exportAuditLogs({}, 'admin-123', 'json');

      expect(result).toEqual(
        expect.objectContaining({
          entries: mockData,
          totalCount: 1,
          exportedBy: 'admin-123',
          filters: {}
        })
      );
    });

    it('should export audit logs as CSV', async () => {
      const mockData = [
        {
          id: 'log-1',
          adminId: 'admin-123',
          action: 'user_kick',
          targetType: 'user',
          targetId: 'user-456',
          details: { reason: 'spam' },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          createdAt: '2023-01-01T00:00:00Z'
        }
      ];

      vi.spyOn(auditService, 'getAuditLogs').mockResolvedValue({
        entries: mockData as AuditLogEntry[],
        totalCount: 1
      });
      vi.spyOn(auditService, 'logAction').mockResolvedValue();

      const result = await auditService.exportAuditLogs({}, 'admin-123', 'csv');

      expect(typeof result).toBe('string');
      expect(result).toContain('ID,Admin ID,Action,Target Type');
      expect(result).toContain('log-1');
      expect(result).toContain('user_kick');
    });
  });

  describe('searchAuditLogs', () => {
    it('should search audit logs by text', async () => {
      const mockData = [
        {
          id: 'log-1',
          action: 'user_kick',
          details: { reason: 'spam' }
        }
      ];

      const mockQuery = {
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null, count: 1 })
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      });

      const result = await auditService.searchAuditLogs('kick');

      expect(result.entries).toEqual(mockData);
      expect(result.totalCount).toBe(1);
      expect(mockQuery.or).toHaveBeenCalledWith('action.ilike.%kick%,details.cs.{"search":"kick"}');
    });
  });

  describe('cleanupOldLogs', () => {
    it('should clean up old audit logs', async () => {
      const mockData = [{ id: 'log-1' }, { id: 'log-2' }];

      const mockQuery = {
        lt: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: mockData, error: null })
      };

      (supabase.from as any).mockReturnValue({
        delete: vi.fn().mockReturnValue(mockQuery)
      });

      vi.spyOn(auditService, 'logAction').mockResolvedValue();

      const result = await auditService.cleanupOldLogs(365);

      expect(result).toBe(2);
      expect(mockQuery.lt).toHaveBeenCalledWith(
        'created_at',
        expect.any(String)
      );
    });

    it('should not log cleanup action when no logs deleted', async () => {
      const mockQuery = {
        lt: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [], error: null })
      };

      (supabase.from as any).mockReturnValue({
        delete: vi.fn().mockReturnValue(mockQuery)
      });

      const logActionSpy = vi.spyOn(auditService, 'logAction').mockResolvedValue();

      const result = await auditService.cleanupOldLogs(365);

      expect(result).toBe(0);
      expect(logActionSpy).not.toHaveBeenCalled();
    });
  });

  describe('getAuditStatistics', () => {
    it('should return audit statistics', async () => {
      const mockData = [
        {
          action: 'user_kick',
          target_type: 'user',
          admin_id: 'admin-1',
          created_at: '2023-01-01T00:00:00Z',
          admin: { nickname: 'Admin One' }
        },
        {
          action: 'user_ban',
          target_type: 'user',
          admin_id: 'admin-2',
          created_at: '2023-01-01T00:00:00Z',
          admin: { nickname: 'Admin Two' }
        }
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockData, error: null })
      });

      const result = await auditService.getAuditStatistics();

      expect(result.totalEntries).toBe(2);
      expect(result.entriesByAction).toEqual({
        'user_kick': 1,
        'user_ban': 1
      });
      expect(result.entriesByTargetType).toEqual({
        'user': 2
      });
      expect(result.entriesByAdmin).toEqual({
        'Admin One': 1,
        'Admin Two': 1
      });
      expect(result.dailyActivity).toEqual([
        { date: '2023-01-01', count: 2 }
      ]);
    });
  });
});