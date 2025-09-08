import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { adminService } from '../../services/supabase/adminService';
import { kickService } from '../../services/supabase/kickService';
import { banService } from '../../services/supabase/banService';
import { siteSettingsService } from '../../services/supabase/siteSettingsService';
import { auditService } from '../../services/supabase/auditService';
import { supabase } from '../../config/supabase';

// Mock supabase for integration tests
vi.mock('../../config/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      containedBy: vi.fn().mockReturnThis(),
      rangeGt: vi.fn().mockReturnThis(),
      rangeGte: vi.fn().mockReturnThis(),
      rangeLt: vi.fn().mockReturnThis(),
      rangeLte: vi.fn().mockReturnThis(),
      rangeAdjacent: vi.fn().mockReturnThis(),
      overlaps: vi.fn().mockReturnThis(),
      textSearch: vi.fn().mockReturnThis(),
      match: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      abortSignal: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      csv: vi.fn().mockReturnThis(),
      geojson: vi.fn().mockReturnThis(),
      explain: vi.fn().mockReturnThis(),
      rollback: vi.fn().mockReturnThis(),
      returns: vi.fn().mockReturnThis(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      track: vi.fn(),
    })),
    rpc: vi.fn(),
  },
}));

describe('Admin Workflows Integration Tests', () => {
  const mockSupabaseFrom = vi.mocked(supabase.from);
  const mockSupabaseChannel = vi.mocked(supabase.channel);
  const mockSupabaseRpc = vi.mocked(supabase.rpc);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Kick Workflow', () => {
    it('should execute complete kick workflow with audit logging', async () => {
      // Mock successful database operations
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      };

      mockSupabaseFrom.mockReturnValue(mockChain as any);
      mockSupabaseChannel.mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
        send: vi.fn(),
      } as any);

      // Mock successful operations
      mockChain.update.mockResolvedValue({ error: null });
      mockChain.upsert.mockResolvedValue({ error: null });
      mockChain.insert.mockResolvedValue({ error: null });

      // Execute kick workflow
      const kickResult = await kickService.kickUser('user-123', 'admin-123', 'Inappropriate behavior');

      // Verify kick was successful
      expect(kickResult.success).toBe(true);
      expect(kickResult.message).toBe('User kicked successfully');

      // Verify audit log was created
      expect(mockChain.insert).toHaveBeenCalled();
      expect(mockChain.update).toHaveBeenCalled();
      expect(mockChain.upsert).toHaveBeenCalled();
    });

    it('should handle kick workflow rollback on failure', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      };

      mockSupabaseFrom.mockReturnValue(mockChain as any);

      // Mock failure in user status update
      mockChain.update.mockResolvedValueOnce({ error: { message: 'Database error' } });

      const kickResult = await kickService.kickUser('user-123', 'admin-123', 'Test');

      expect(kickResult.success).toBe(false);
      expect(kickResult.message).toBe('Database error');
    });
  });

  describe('Complete Ban Workflow', () => {
    it('should execute complete ban workflow with user status update', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      };

      mockSupabaseFrom.mockReturnValue(mockChain as any);

      // Mock successful operations
      mockChain.insert.mockResolvedValue({ error: null });
      mockChain.update.mockResolvedValue({ error: null });

      const banResult = await banService.banUser('user-123', 'admin-123', 'Spam', 24);

      expect(banResult.success).toBe(true);
      expect(banResult.message).toBe('User banned successfully');

      // Verify both ban record and user status were updated
      expect(mockChain.insert).toHaveBeenCalled(); // Ban record
      expect(mockChain.update).toHaveBeenCalled(); // User status
    });

    it('should handle ban workflow with IP banning', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      };

      mockSupabaseFrom.mockReturnValue(mockChain as any);
      mockChain.insert.mockResolvedValue({ error: null });

      const banResult = await banService.banIP('192.168.1.1', 'admin-123', 'Malicious activity', 48);

      expect(banResult.success).toBe(true);
      expect(banResult.message).toBe('IP banned successfully');
      expect(mockChain.insert).toHaveBeenCalled();
    });
  });

  describe('Site Settings Workflow', () => {
    it('should execute complete settings update workflow', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockSupabaseFrom.mockReturnValue(mockChain as any);
      mockChain.upsert.mockResolvedValue({ error: null });
      mockChain.insert.mockResolvedValue({ error: null });

      const settings = {
        adsenseLink1: 'https://example.com/ad1',
        adsenseLink2: 'https://example.com/ad2',
        adsenseLink3: 'https://example.com/ad3',
        maintenanceMode: false,
        maxImageUploadsStandard: 15,
      };

      const result = await siteSettingsService.updateMultipleSettings(settings, 'admin-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Settings updated successfully');

      // Verify settings were saved and audit logged
      expect(mockChain.upsert).toHaveBeenCalled();
      expect(mockChain.insert).toHaveBeenCalled(); // Audit log
    });

    it('should handle settings rollback on partial failure', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockSupabaseFrom.mockReturnValue(mockChain as any);

      // Mock failure on second setting
      mockChain.upsert
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: { message: 'Constraint violation' } });

      const settings = {
        adsenseLink1: 'https://example.com/ad1',
        maintenanceMode: true,
      };

      const result = await siteSettingsService.updateMultipleSettings(settings, 'admin-123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to update some settings');
    });
  });

  describe('Real-time Notification Workflow', () => {
    it('should handle real-time kick notification delivery', async () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
        send: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabaseChannel.mockReturnValue(mockChannel as any);

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      };

      mockSupabaseFrom.mockReturnValue(mockChain as any);
      mockChain.update.mockResolvedValue({ error: null });
      mockChain.upsert.mockResolvedValue({ error: null });
      mockChain.insert.mockResolvedValue({ error: null });

      // Execute kick with real-time notification
      const result = await kickService.kickUser('user-123', 'admin-123', 'Test kick');

      expect(result.success).toBe(true);

      // Verify real-time notification was sent
      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'user_kicked',
        payload: expect.objectContaining({
          userId: 'user-123',
          reason: 'Test kick',
        }),
      });
    });

    it('should handle real-time notification failure gracefully', async () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
        send: vi.fn().mockResolvedValue({ error: { message: 'Channel error' } }),
      };

      mockSupabaseChannel.mockReturnValue(mockChannel as any);

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      };

      mockSupabaseFrom.mockReturnValue(mockChain as any);
      mockChain.update.mockResolvedValue({ error: null });
      mockChain.upsert.mockResolvedValue({ error: null });
      mockChain.insert.mockResolvedValue({ error: null });

      // Kick should still succeed even if notification fails
      const result = await kickService.kickUser('user-123', 'admin-123', 'Test kick');

      expect(result.success).toBe(true);
      expect(result.message).toBe('User kicked successfully');
    });
  });

  describe('Database Transaction Workflow', () => {
    it('should handle complex multi-table operations', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      };

      mockSupabaseFrom.mockReturnValue(mockChain as any);

      // Mock successful operations for user deletion workflow
      mockChain.delete.mockResolvedValue({ error: null });
      mockChain.insert.mockResolvedValue({ error: null });

      const result = await adminService.deleteUser('user-123', 'admin-123', 'Account cleanup');

      expect(result.success).toBe(true);
      expect(result.message).toBe('User deleted successfully');

      // Verify multiple table operations
      expect(mockChain.delete).toHaveBeenCalledTimes(6); // presence, blocks, reports, typing, messages, user
      expect(mockChain.insert).toHaveBeenCalled(); // audit log
    });

    it('should rollback on transaction failure', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { nickname: 'TestUser', role: 'standard' }, error: null }),
      };

      mockSupabaseFrom.mockReturnValue(mockChain as any);

      // Mock failure on user deletion
      mockChain.delete
        .mockResolvedValueOnce({ error: null }) // presence
        .mockResolvedValueOnce({ error: null }) // blocks
        .mockResolvedValueOnce({ error: null }) // reports
        .mockResolvedValueOnce({ error: null }) // typing
        .mockResolvedValueOnce({ error: null }) // messages
        .mockResolvedValueOnce({ error: { message: 'Foreign key constraint' } }); // user

      const result = await adminService.deleteUser('user-123', 'admin-123', 'Account cleanup');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Foreign key constraint');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large user list operations efficiently', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };

      mockSupabaseFrom.mockReturnValue(mockChain as any);

      // Mock large dataset
      const largeUserList = Array.from({ length: 1000 }, (_, i) => ({
        id: `user-${i}`,
        nickname: `User${i}`,
        status: 'active',
      }));

      mockChain.select.mockResolvedValue({
        data: largeUserList,
        count: 1000,
        error: null,
      });

      const startTime = Date.now();
      
      // Test bulk kick operation
      const userIds = largeUserList.slice(0, 100).map(u => u.id);
      mockChain.update.mockResolvedValue({ error: null });
      mockChain.insert.mockResolvedValue({ error: null });

      const result = await kickService.kickMultipleUsers(userIds, 'admin-123', 'Bulk cleanup');
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.results).toHaveLength(100);
    });

    it('should handle concurrent admin operations', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      };

      mockSupabaseFrom.mockReturnValue(mockChain as any);
      mockChain.update.mockResolvedValue({ error: null });
      mockChain.insert.mockResolvedValue({ error: null });

      // Simulate concurrent operations
      const operations = [
        kickService.kickUser('user-1', 'admin-123', 'Reason 1'),
        kickService.kickUser('user-2', 'admin-123', 'Reason 2'),
        kickService.kickUser('user-3', 'admin-123', 'Reason 3'),
        banService.banUser('user-4', 'admin-123', 'Reason 4', 24),
        banService.banUser('user-5', 'admin-123', 'Reason 5', 48),
      ];

      const results = await Promise.all(operations);

      // All operations should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Verify all database operations were called
      expect(mockChain.update).toHaveBeenCalledTimes(5);
      expect(mockChain.insert).toHaveBeenCalledTimes(7); // 5 audit logs + 2 ban records
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should recover from network failures with retry mechanism', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      };

      mockSupabaseFrom.mockReturnValue(mockChain as any);

      // Mock network failure then success
      mockChain.update
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ error: null });

      mockChain.insert.mockResolvedValue({ error: null });

      const result = await kickService.kickUser('user-123', 'admin-123', 'Test');

      expect(result.success).toBe(true);
      expect(mockChain.update).toHaveBeenCalledTimes(2); // Initial failure + retry
    });

    it('should handle audit logging failures gracefully', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      };

      mockSupabaseFrom.mockReturnValue(mockChain as any);

      // Mock successful user operation but failed audit log
      mockChain.update.mockResolvedValue({ error: null });
      mockChain.insert.mockResolvedValue({ error: { message: 'Audit log failed' } });

      const result = await kickService.kickUser('user-123', 'admin-123', 'Test');

      // Operation should still succeed even if audit logging fails
      expect(result.success).toBe(true);
      expect(result.message).toBe('User kicked successfully');
    });
  });
});