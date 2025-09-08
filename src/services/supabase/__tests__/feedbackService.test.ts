import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeedbackService } from '../feedbackService';
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

describe('FeedbackService', () => {
  let feedbackService: FeedbackService;
  let mockFrom: any;
  let mockSelect: any;
  let mockOrder: any;
  let mockEq: any;
  let mockOr: any;
  let mockUpdate: any;

  beforeEach(() => {
    vi.clearAllMocks();
    feedbackService = new FeedbackService();
    
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

  describe('getAllFeedback', () => {
    it('should fetch all feedback with user details', async () => {
      const mockFeedback = [
        {
          id: '1',
          user_id: 'user1',
          email: 'user@example.com',
          subject: 'Bug Report',
          message: 'Found a bug in the app',
          status: 'pending',
          admin_notes: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          user: { id: 'user1', nickname: 'TestUser', role: 'user' }
        }
      ];

      mockOrder.mockReturnValue({ data: mockFeedback, error: null });

      const result = await feedbackService.getAllFeedback();

      expect(mockFrom).toHaveBeenCalledWith('feedback');
      expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('user:user_id'));
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: '1',
        userId: 'user1',
        email: 'user@example.com',
        subject: 'Bug Report',
        message: 'Found a bug in the app',
        status: 'pending',
        adminNotes: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        user: { id: 'user1', nickname: 'TestUser', role: 'user' }
      });
    });

    it('should handle feedback without user (anonymous)', async () => {
      const mockFeedback = [
        {
          id: '1',
          user_id: null,
          email: 'anonymous@example.com',
          subject: 'Anonymous Feedback',
          message: 'Anonymous feedback message',
          status: 'pending',
          admin_notes: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          user: null
        }
      ];

      mockOrder.mockReturnValue({ data: mockFeedback, error: null });

      const result = await feedbackService.getAllFeedback();

      expect(result[0].user).toBeUndefined();
      expect(result[0].email).toBe('anonymous@example.com');
    });

    it('should handle database errors', async () => {
      mockOrder.mockReturnValue({ data: null, error: { message: 'Database error' } });

      await expect(feedbackService.getAllFeedback()).rejects.toThrow('Failed to fetch feedback: Database error');
    });

    it('should return empty array when no data', async () => {
      mockOrder.mockReturnValue({ data: null, error: null });

      const result = await feedbackService.getAllFeedback();
      expect(result).toEqual([]);
    });
  });

  describe('getFeedbackByStatus', () => {
    it('should fetch feedback filtered by status', async () => {
      const mockFeedback = [
        {
          id: '1',
          user_id: 'user1',
          email: 'user@example.com',
          subject: 'Pending Feedback',
          message: 'This is pending',
          status: 'pending',
          admin_notes: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          user: { id: 'user1', nickname: 'TestUser', role: 'user' }
        }
      ];

      mockOrder.mockReturnValue({ data: mockFeedback, error: null });

      const result = await feedbackService.getFeedbackByStatus('pending');

      expect(mockEq).toHaveBeenCalledWith('status', 'pending');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('pending');
    });

    it('should handle different status values', async () => {
      mockOrder.mockReturnValue({ data: [], error: null });

      await feedbackService.getFeedbackByStatus('resolved');
      expect(mockEq).toHaveBeenCalledWith('status', 'resolved');

      await feedbackService.getFeedbackByStatus('in_progress');
      expect(mockEq).toHaveBeenCalledWith('status', 'in_progress');

      await feedbackService.getFeedbackByStatus('read');
      expect(mockEq).toHaveBeenCalledWith('status', 'read');
    });
  });

  describe('updateFeedback', () => {
    it('should update feedback with status and admin notes', async () => {
      const mockEqUpdate = vi.fn(() => ({ data: null, error: null }));
      mockUpdate.mockReturnValue({ eq: mockEqUpdate });

      await feedbackService.updateFeedback('feedback1', {
        status: 'resolved',
        adminNotes: 'Issue resolved'
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'resolved',
        admin_notes: 'Issue resolved',
        updated_at: expect.any(String)
      });
      expect(mockEqUpdate).toHaveBeenCalledWith('id', 'feedback1');
    });

    it('should update feedback with category and priority', async () => {
      const mockEqUpdate = vi.fn(() => ({ data: null, error: null }));
      mockUpdate.mockReturnValue({ eq: mockEqUpdate });

      await feedbackService.updateFeedback('feedback1', {
        category: 'bug',
        priority: 'high'
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        category: 'bug',
        priority: 'high',
        updated_at: expect.any(String)
      });
    });

    it('should handle update errors', async () => {
      const mockEqUpdate = vi.fn(() => ({ data: null, error: { message: 'Update failed' } }));
      mockUpdate.mockReturnValue({ eq: mockEqUpdate });

      await expect(feedbackService.updateFeedback('feedback1', { status: 'read' }))
        .rejects.toThrow('Failed to update feedback: Update failed');
    });
  });

  describe('searchFeedback', () => {
    it('should search feedback by term', async () => {
      const mockFeedback = [
        {
          id: '1',
          user_id: 'user1',
          email: 'user@example.com',
          subject: 'Bug in search feature',
          message: 'Search is not working',
          status: 'pending',
          admin_notes: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          user: { id: 'user1', nickname: 'TestUser', role: 'user' }
        }
      ];

      mockOrder.mockReturnValue({ data: mockFeedback, error: null });

      const result = await feedbackService.searchFeedback('bug');

      expect(mockOr).toHaveBeenCalledWith(
        'subject.ilike.%bug%,message.ilike.%bug%,email.ilike.%bug%'
      );
      expect(result).toHaveLength(1);
    });

    it('should handle search errors', async () => {
      mockOrder.mockReturnValue({ data: null, error: { message: 'Search failed' } });

      await expect(feedbackService.searchFeedback('test'))
        .rejects.toThrow('Failed to search feedback: Search failed');
    });
  });

  describe('getFeedbackStats', () => {
    it('should calculate feedback statistics', async () => {
      const mockFeedback = [
        { status: 'pending' },
        { status: 'pending' },
        { status: 'read' },
        { status: 'in_progress' },
        { status: 'resolved' }
      ];

      mockFrom.mockReturnValue({
        select: vi.fn(() => ({ data: mockFeedback, error: null }))
      });

      const result = await feedbackService.getFeedbackStats();

      expect(result).toEqual({
        total: 5,
        pending: 2,
        read: 1,
        inProgress: 1,
        resolved: 1
      });
    });

    it('should handle empty results', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({ data: [], error: null }))
      });

      const result = await feedbackService.getFeedbackStats();

      expect(result).toEqual({
        total: 0,
        pending: 0,
        read: 0,
        inProgress: 0,
        resolved: 0
      });
    });

    it('should handle stats errors', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({ data: null, error: { message: 'Stats failed' } }))
      });

      await expect(feedbackService.getFeedbackStats())
        .rejects.toThrow('Failed to fetch feedback stats: Stats failed');
    });
  });

  describe('markAsRead', () => {
    it('should mark feedback as read', async () => {
      const mockEqUpdate = vi.fn(() => ({ data: null, error: null }));
      mockUpdate.mockReturnValue({ eq: mockEqUpdate });

      await feedbackService.markAsRead('feedback1');

      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'read',
        updated_at: expect.any(String)
      });
    });
  });

  describe('categorizeFeedback', () => {
    it('should assign category and priority to feedback', async () => {
      const mockEqUpdate = vi.fn(() => ({ data: null, error: null }));
      mockUpdate.mockReturnValue({ eq: mockEqUpdate });

      await feedbackService.categorizeFeedback('feedback1', 'bug', 'high');

      expect(mockUpdate).toHaveBeenCalledWith({
        category: 'bug',
        priority: 'high',
        updated_at: expect.any(String)
      });
    });
  });
});