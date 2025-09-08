import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportsService } from '../reportsService';
import { supabase } from '../../../config/supabase';

// Mock supabase
vi.mock('../../../config/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null
        })),
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null
          }))
        })),
        or: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null
        }))
      }))
    }))
  }
}));

describe('ReportsService', () => {
  let reportsService: ReportsService;
  let mockFrom: any;
  let mockSelect: any;
  let mockOrder: any;
  let mockEq: any;
  let mockOr: any;
  let mockUpdate: any;

  beforeEach(() => {
    vi.clearAllMocks();
    reportsService = new ReportsService();
    
    mockOrder = vi.fn(() => ({ data: [], error: null }));
    mockEq = vi.fn(() => ({ order: mockOrder }));
    mockOr = vi.fn(() => ({ order: mockOrder }));
    mockSelect = vi.fn(() => ({ 
      order: mockOrder,
      eq: mockEq,
      or: mockOr
    }));
    mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({ data: null, error: null }))
    }));
    mockFrom = vi.fn(() => ({
      select: mockSelect,
      update: mockUpdate
    }));
    
    (supabase.from as any) = mockFrom;
  });

  describe('getAllReports', () => {
    it('should fetch all reports with user details', async () => {
      const mockReports = [
        {
          id: '1',
          reporter_id: 'user1',
          reported_id: 'user2',
          message_id: 'msg1',
          reason: 'spam',
          description: 'Sending spam messages',
          status: 'pending',
          created_at: '2024-01-01T00:00:00Z',
          resolved_at: null,
          reporter: { id: 'user1', nickname: 'Reporter', role: 'user' },
          reported: { id: 'user2', nickname: 'Reported', role: 'user' }
        }
      ];

      mockOrder.mockReturnValue({ data: mockReports, error: null });

      const result = await reportsService.getAllReports();

      expect(mockFrom).toHaveBeenCalledWith('reports');
      expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('reporter:reporter_id'));
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: '1',
        reporterId: 'user1',
        reportedId: 'user2',
        messageId: 'msg1',
        reason: 'spam',
        description: 'Sending spam messages',
        status: 'pending',
        createdAt: '2024-01-01T00:00:00Z',
        resolvedAt: null,
        reporter: { id: 'user1', nickname: 'Reporter', role: 'user' },
        reported: { id: 'user2', nickname: 'Reported', role: 'user' }
      });
    });

    it('should handle database errors', async () => {
      mockOrder.mockReturnValue({ data: null, error: { message: 'Database error' } });

      await expect(reportsService.getAllReports()).rejects.toThrow('Failed to fetch reports: Database error');
    });

    it('should return empty array when no data', async () => {
      mockOrder.mockReturnValue({ data: null, error: null });

      const result = await reportsService.getAllReports();
      expect(result).toEqual([]);
    });
  });

  describe('getReportsByStatus', () => {
    it('should fetch reports filtered by status', async () => {
      const mockReports = [
        {
          id: '1',
          reporter_id: 'user1',
          reported_id: 'user2',
          message_id: null,
          reason: 'harassment',
          description: null,
          status: 'pending',
          created_at: '2024-01-01T00:00:00Z',
          resolved_at: null,
          reporter: { id: 'user1', nickname: 'Reporter', role: 'user' },
          reported: { id: 'user2', nickname: 'Reported', role: 'user' }
        }
      ];

      mockOrder.mockReturnValue({ data: mockReports, error: null });

      const result = await reportsService.getReportsByStatus('pending');

      expect(mockEq).toHaveBeenCalledWith('status', 'pending');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('pending');
    });

    it('should handle different status values', async () => {
      mockOrder.mockReturnValue({ data: [], error: null });

      await reportsService.getReportsByStatus('resolved');
      expect(mockEq).toHaveBeenCalledWith('status', 'resolved');

      await reportsService.getReportsByStatus('reviewed');
      expect(mockEq).toHaveBeenCalledWith('status', 'reviewed');
    });
  });

  describe('updateReportStatus', () => {
    it('should update report status without admin notes', async () => {
      const mockEqUpdate = vi.fn(() => ({ data: null, error: null }));
      mockUpdate.mockReturnValue({ eq: mockEqUpdate });

      await reportsService.updateReportStatus('report1', 'reviewed');

      expect(mockUpdate).toHaveBeenCalledWith({ status: 'reviewed' });
      expect(mockEqUpdate).toHaveBeenCalledWith('id', 'report1');
    });

    it('should update report status with admin notes', async () => {
      const mockEqUpdate = vi.fn(() => ({ data: null, error: null }));
      mockUpdate.mockReturnValue({ eq: mockEqUpdate });

      await reportsService.updateReportStatus('report1', 'resolved', 'Issue resolved');

      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'resolved',
        admin_notes: 'Issue resolved',
        resolved_at: expect.any(String)
      });
    });

    it('should add resolved_at timestamp when status is resolved', async () => {
      const mockEqUpdate = vi.fn(() => ({ data: null, error: null }));
      mockUpdate.mockReturnValue({ eq: mockEqUpdate });

      await reportsService.updateReportStatus('report1', 'resolved');

      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'resolved',
        resolved_at: expect.any(String)
      });
    });

    it('should handle update errors', async () => {
      const mockEqUpdate = vi.fn(() => ({ data: null, error: { message: 'Update failed' } }));
      mockUpdate.mockReturnValue({ eq: mockEqUpdate });

      await expect(reportsService.updateReportStatus('report1', 'reviewed'))
        .rejects.toThrow('Failed to update report status: Update failed');
    });
  });

  describe('searchReports', () => {
    it('should search reports by term', async () => {
      const mockReports = [
        {
          id: '1',
          reporter_id: 'user1',
          reported_id: 'user2',
          message_id: null,
          reason: 'spam content',
          description: null,
          status: 'pending',
          created_at: '2024-01-01T00:00:00Z',
          resolved_at: null,
          reporter: { id: 'user1', nickname: 'TestUser', role: 'user' },
          reported: { id: 'user2', nickname: 'Reported', role: 'user' }
        }
      ];

      mockOrder.mockReturnValue({ data: mockReports, error: null });

      const result = await reportsService.searchReports('spam');

      expect(mockOr).toHaveBeenCalledWith(
        'reporter.nickname.ilike.%spam%,reported.nickname.ilike.%spam%,reason.ilike.%spam%'
      );
      expect(result).toHaveLength(1);
    });

    it('should handle search errors', async () => {
      mockOrder.mockReturnValue({ data: null, error: { message: 'Search failed' } });

      await expect(reportsService.searchReports('test'))
        .rejects.toThrow('Failed to search reports: Search failed');
    });
  });

  describe('getReportStats', () => {
    it('should calculate report statistics', async () => {
      const mockReports = [
        { status: 'pending' },
        { status: 'pending' },
        { status: 'reviewed' },
        { status: 'resolved' }
      ];

      mockFrom.mockReturnValue({
        select: vi.fn(() => ({ data: mockReports, error: null }))
      });

      const result = await reportsService.getReportStats();

      expect(result).toEqual({
        total: 4,
        pending: 2,
        reviewed: 1,
        resolved: 1
      });
    });

    it('should handle empty results', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({ data: [], error: null }))
      });

      const result = await reportsService.getReportStats();

      expect(result).toEqual({
        total: 0,
        pending: 0,
        reviewed: 0,
        resolved: 0
      });
    });

    it('should handle stats errors', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({ data: null, error: { message: 'Stats failed' } }))
      });

      await expect(reportsService.getReportStats())
        .rejects.toThrow('Failed to fetch report stats: Stats failed');
    });
  });
});