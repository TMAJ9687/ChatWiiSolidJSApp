import { supabase } from '../../config/supabase';
import { FeedbackWithUser } from '../../types/admin.types';

export class FeedbackService {
  /**
   * Get all feedback with user details
   */
  async getAllFeedback(): Promise<FeedbackWithUser[]> {
    const { data, error } = await supabase
      .from('feedback')
      .select(`
        id,
        user_id,
        email,
        subject,
        message,
        status,
        admin_notes,
        created_at,
        updated_at,
        user:user_id(id, nickname, role)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch feedback: ${error.message}`);
    }

    return data?.map(feedback => ({
      id: feedback.id,
      userId: feedback.user_id,
      email: feedback.email,
      subject: feedback.subject,
      message: feedback.message,
      status: feedback.status,
      adminNotes: feedback.admin_notes,
      createdAt: feedback.created_at,
      updatedAt: feedback.updated_at,
      user: feedback.user ? {
        id: feedback.user.id,
        nickname: feedback.user.nickname,
        role: feedback.user.role
      } : undefined
    })) || [];
  }

  /**
   * Get feedback by status
   */
  async getFeedbackByStatus(status: 'pending' | 'read' | 'in_progress' | 'resolved'): Promise<FeedbackWithUser[]> {
    const { data, error } = await supabase
      .from('feedback')
      .select(`
        id,
        user_id,
        email,
        subject,
        message,
        status,
        admin_notes,
        created_at,
        updated_at,
        user:user_id(id, nickname, role)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch feedback by status: ${error.message}`);
    }

    return data?.map(feedback => ({
      id: feedback.id,
      userId: feedback.user_id,
      email: feedback.email,
      subject: feedback.subject,
      message: feedback.message,
      status: feedback.status,
      adminNotes: feedback.admin_notes,
      createdAt: feedback.created_at,
      updatedAt: feedback.updated_at,
      user: feedback.user ? {
        id: feedback.user.id,
        nickname: feedback.user.nickname,
        role: feedback.user.role
      } : undefined
    })) || [];
  }

  /**
   * Update feedback status and admin notes
   */
  async updateFeedback(
    feedbackId: string,
    updates: {
      status?: 'pending' | 'read' | 'in_progress' | 'resolved';
      adminNotes?: string;
      category?: 'bug' | 'feature' | 'complaint' | 'suggestion' | 'other';
      priority?: 'low' | 'medium' | 'high' | 'urgent';
    }
  ): Promise<void> {
    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Map camelCase to snake_case for database
    if (updates.adminNotes !== undefined) {
      updateData.admin_notes = updates.adminNotes;
      delete updateData.adminNotes;
    }

    const { error } = await supabase
      .from('feedback')
      .update(updateData)
      .eq('id', feedbackId);

    if (error) {
      throw new Error(`Failed to update feedback: ${error.message}`);
    }
  }

  /**
   * Search feedback by subject, message, or user
   */
  async searchFeedback(searchTerm: string): Promise<FeedbackWithUser[]> {
    const { data, error } = await supabase
      .from('feedback')
      .select(`
        id,
        user_id,
        email,
        subject,
        message,
        status,
        admin_notes,
        created_at,
        updated_at,
        user:user_id(id, nickname, role)
      `)
      .or(`subject.ilike.%${searchTerm}%,message.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to search feedback: ${error.message}`);
    }

    return data?.map(feedback => ({
      id: feedback.id,
      userId: feedback.user_id,
      email: feedback.email,
      subject: feedback.subject,
      message: feedback.message,
      status: feedback.status,
      adminNotes: feedback.admin_notes,
      createdAt: feedback.created_at,
      updatedAt: feedback.updated_at,
      user: feedback.user ? {
        id: feedback.user.id,
        nickname: feedback.user.nickname,
        role: feedback.user.role
      } : undefined
    })) || [];
  }

  /**
   * Get feedback statistics
   */
  async getFeedbackStats(): Promise<{
    total: number;
    pending: number;
    read: number;
    inProgress: number;
    resolved: number;
  }> {
    const { data, error } = await supabase
      .from('feedback')
      .select('status');

    if (error) {
      throw new Error(`Failed to fetch feedback stats: ${error.message}`);
    }

    const stats = {
      total: data?.length || 0,
      pending: 0,
      read: 0,
      inProgress: 0,
      resolved: 0
    };

    data?.forEach(feedback => {
      switch (feedback.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'read':
          stats.read++;
          break;
        case 'in_progress':
          stats.inProgress++;
          break;
        case 'resolved':
          stats.resolved++;
          break;
      }
    });

    return stats;
  }

  /**
   * Mark feedback as read
   */
  async markAsRead(feedbackId: string): Promise<void> {
    await this.updateFeedback(feedbackId, { status: 'read' });
  }

  /**
   * Assign category and priority to feedback
   */
  async categorizeFeedback(
    feedbackId: string,
    category: 'bug' | 'feature' | 'complaint' | 'suggestion' | 'other',
    priority: 'low' | 'medium' | 'high' | 'urgent'
  ): Promise<void> {
    await this.updateFeedback(feedbackId, { category, priority });
  }
}

export const feedbackService = new FeedbackService();