import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { adminService } from '../adminService';
import { supabase } from '../../../config/supabase';
import type { UserAction } from '../../../types/admin.types';

// Mock supabase
vi.mock('../../../config/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
    })),
  },
}));

describe('AdminService', () => {
  const mockSupabaseFrom = vi.mocked(supabase.from);
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Set faster retry config for testing
    adminService.setRetryConfig({
      maxRetries: 1,
      baseDelay: 10,
      maxDelay: 50
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isAdmin', () => {
    it('should return true for admin user', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin' },
          error: null
        })
      };
      
      mockSupabaseFrom.mockReturnValue(mockChain as any);

      const result = await adminService.isAdmin('admin-user-id');
      
      expect(result).toBe(true);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('users');
      expect(mockChain.select).toHaveBeenCalledWith('role');
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'admin-user-id');
    });

    it('should return false for non-admin user', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'standard' },
          error: null
        })
      };
      
      mockSupabaseFrom.mockReturnValue(mockChain as any);

      const result = await adminService.isAdmin('standard-user-id');
      
      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      };
      
      mockSupabaseFrom.mockReturnValue(mockChain as any);

      const result = await adminService.isAdmin('user-id');
      
      expect(result).toBe(false);
    });
  });

  describe('performUserAction', () => {
    it('should successfully kick a user', async () => {
      // Mock the update operations
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };
      
      // Mock the audit log insert
      const mockInsertChain = {
        insert: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockUpdateChain as any) // users table update
        .mockReturnValueOnce(mockUpdateChain as any) // users table update for offline
        .mockReturnValueOnce(mockUpdateChain as any) // presence table update
        .mockReturnValueOnce(mockInsertChain as any); // audit log insert

      const action: UserAction = {
        type: 'kick',
        userId: 'user-123',
        adminId: 'admin-123',
        reason: 'Inappropriate behavior'
      };

      const result = await adminService.performUserAction(action);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User kicked successfully');
    });

    it('should successfully upgrade user to VIP', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };
      
      const mockInsertChain = {
        insert: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockUpdateChain as any) // users table update
        .mockReturnValueOnce(mockInsertChain as any); // audit log insert

      const action: UserAction = {
        type: 'upgrade',
        userId: 'user-123',
        adminId: 'admin-123'
      };

      const result = await adminService.performUserAction(action);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User upgraded to VIP successfully');
    });

    it('should handle unknown action type', async () => {
      const action: UserAction = {
        type: 'unknown' as any,
        userId: 'user-123',
        adminId: 'admin-123'
      };

      const result = await adminService.performUserAction(action);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Unknown action type');
    });

    it('should handle database errors gracefully', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'Database error' } })
      };

      mockSupabaseFrom.mockReturnValue(mockUpdateChain as any);

      const action: UserAction = {
        type: 'kick',
        userId: 'user-123',
        adminId: 'admin-123'
      };

      const result = await adminService.performUserAction(action);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Database error');
    }, 10000); // Increase timeout for retry mechanism
  });

  describe('getAuditLogs', () => {
    it('should retrieve audit logs with pagination', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          admin_id: 'admin-123',
          action: 'kick',
          target_type: 'user',
          target_id: 'user-123',
          details: { reason: 'Test' },
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockLogs,
          count: 1,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockChain as any);

      const result = await adminService.getAuditLogs('admin-123', 'user', 1, 10);

      expect(result.logs).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.logs[0].adminId).toBe('admin-123');
      expect(mockChain.eq).toHaveBeenCalledWith('admin_id', 'admin-123');
      expect(mockChain.eq).toHaveBeenCalledWith('target_type', 'user');
    });

    it('should handle database errors when retrieving audit logs', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          count: 0,
          error: { message: 'Database error' }
        })
      };

      mockSupabaseFrom.mockReturnValue(mockChain as any);

      const result = await adminService.getAuditLogs();

      expect(result.logs).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('updateUserStatus', () => {
    it('should update user status and log admin action', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };
      
      const mockInsertChain = {
        insert: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockUpdateChain as any) // users table update
        .mockReturnValueOnce(mockUpdateChain as any) // users table update for offline
        .mockReturnValueOnce(mockUpdateChain as any) // presence table update
        .mockReturnValueOnce(mockInsertChain as any); // audit log insert

      await adminService.updateUserStatus('user-123', 'kicked', 'admin-123', 'Test reason');

      expect(mockUpdateChain.update).toHaveBeenCalledWith({ status: 'kicked' });
      expect(mockInsertChain.insert).toHaveBeenCalled();
    });

    it('should handle retry mechanism on failure', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn()
          .mockResolvedValueOnce({ error: { message: 'Temporary error' } })
          .mockResolvedValueOnce({ error: null })
      };

      mockSupabaseFrom.mockReturnValue(mockUpdateChain as any);

      // Should not throw error due to retry mechanism
      await expect(adminService.updateUserStatus('user-123', 'active')).resolves.not.toThrow();
    });
  });

  describe('updateUserRole', () => {
    it('should update user role to VIP with expiry date', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };
      
      const mockInsertChain = {
        insert: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockUpdateChain as any) // users table update
        .mockReturnValueOnce(mockInsertChain as any); // audit log insert

      await adminService.updateUserRole('user-123', 'vip', 'admin-123', 60);

      expect(mockUpdateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'vip',
          vip_expires_at: expect.any(String)
        })
      );
    });

    it('should update user role to standard and clear VIP expiry', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };
      
      const mockInsertChain = {
        insert: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockUpdateChain as any)
        .mockReturnValueOnce(mockInsertChain as any);

      await adminService.updateUserRole('user-123', 'standard', 'admin-123');

      expect(mockUpdateChain.update).toHaveBeenCalledWith({
        role: 'standard',
        vip_expires_at: null
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user and all related data with audit logging', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { nickname: 'TestUser', role: 'standard' },
          error: null
        })
      };

      const mockDeleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
        or: vi.fn().mockResolvedValue({ error: null })
      };

      const mockInsertChain = {
        insert: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockSelectChain as any) // get user info
        .mockReturnValueOnce(mockDeleteChain as any) // delete presence
        .mockReturnValueOnce(mockDeleteChain as any) // delete blocks
        .mockReturnValueOnce(mockDeleteChain as any) // delete reports
        .mockReturnValueOnce(mockDeleteChain as any) // delete typing
        .mockReturnValueOnce(mockDeleteChain as any) // delete messages
        .mockReturnValueOnce(mockDeleteChain as any) // delete user
        .mockReturnValueOnce(mockInsertChain as any); // audit log

      await adminService.deleteUser('user-123', 'admin-123', 'Spam account');

      expect(mockDeleteChain.delete).toHaveBeenCalledTimes(6);
      expect(mockInsertChain.insert).toHaveBeenCalled();
    });
  });
});