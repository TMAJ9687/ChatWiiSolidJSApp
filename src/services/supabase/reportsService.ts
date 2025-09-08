import { supabase } from '../../config/supabase';
import { ReportWithUsers } from '../../types/admin.types';

export class ReportsService {
  /**
   * Get all reports with user details
   */
  async getAllReports(): Promise<ReportWithUsers[]> {
    const { data, error } = await supabase
      .from('reports')
      .select(`
        id,
        reporter_id,
        reported_id,
        message_id,
        reason,
        description,
        status,
        created_at,
        resolved_at,
        reporter:reporter_id(id, nickname, role),
        reported:reported_id(id, nickname, role)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch reports: ${error.message}`);
    }

    return data?.map(report => ({
      id: report.id,
      reporterId: report.reporter_id,
      reportedId: report.reported_id,
      messageId: report.message_id,
      reason: report.reason,
      description: report.description,
      status: report.status,
      createdAt: report.created_at,
      resolvedAt: report.resolved_at,
      reporter: {
        id: report.reporter.id,
        nickname: report.reporter.nickname,
        role: report.reporter.role
      },
      reported: {
        id: report.reported.id,
        nickname: report.reported.nickname,
        role: report.reported.role
      }
    })) || [];
  }

  /**
   * Get reports by status
   */
  async getReportsByStatus(status: 'pending' | 'reviewed' | 'resolved'): Promise<ReportWithUsers[]> {
    const { data, error } = await supabase
      .from('reports')
      .select(`
        id,
        reporter_id,
        reported_id,
        message_id,
        reason,
        description,
        status,
        created_at,
        resolved_at,
        reporter:reporter_id(id, nickname, role),
        reported:reported_id(id, nickname, role)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch reports by status: ${error.message}`);
    }

    return data?.map(report => ({
      id: report.id,
      reporterId: report.reporter_id,
      reportedId: report.reported_id,
      messageId: report.message_id,
      reason: report.reason,
      description: report.description,
      status: report.status,
      createdAt: report.created_at,
      resolvedAt: report.resolved_at,
      reporter: {
        id: report.reporter.id,
        nickname: report.reporter.nickname,
        role: report.reporter.role
      },
      reported: {
        id: report.reported.id,
        nickname: report.reported.nickname,
        role: report.reported.role
      }
    })) || [];
  }

  /**
   * Update report status
   */
  async updateReportStatus(
    reportId: string, 
    status: 'pending' | 'reviewed' | 'resolved',
    adminNotes?: string
  ): Promise<void> {
    const updateData: any = { 
      status,
      ...(adminNotes && { admin_notes: adminNotes })
    };

    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('reports')
      .update(updateData)
      .eq('id', reportId);

    if (error) {
      throw new Error(`Failed to update report status: ${error.message}`);
    }
  }

  /**
   * Search reports by reporter or reported user nickname
   */
  async searchReports(searchTerm: string): Promise<ReportWithUsers[]> {
    const { data, error } = await supabase
      .from('reports')
      .select(`
        id,
        reporter_id,
        reported_id,
        message_id,
        reason,
        description,
        status,
        created_at,
        resolved_at,
        reporter:reporter_id(id, nickname, role),
        reported:reported_id(id, nickname, role)
      `)
      .or(`reporter.nickname.ilike.%${searchTerm}%,reported.nickname.ilike.%${searchTerm}%,reason.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to search reports: ${error.message}`);
    }

    return data?.map(report => ({
      id: report.id,
      reporterId: report.reporter_id,
      reportedId: report.reported_id,
      messageId: report.message_id,
      reason: report.reason,
      description: report.description,
      status: report.status,
      createdAt: report.created_at,
      resolvedAt: report.resolved_at,
      reporter: {
        id: report.reporter.id,
        nickname: report.reporter.nickname,
        role: report.reporter.role
      },
      reported: {
        id: report.reported.id,
        nickname: report.reported.nickname,
        role: report.reported.role
      }
    })) || [];
  }

  /**
   * Get report statistics
   */
  async getReportStats(): Promise<{
    total: number;
    pending: number;
    reviewed: number;
    resolved: number;
  }> {
    const { data, error } = await supabase
      .from('reports')
      .select('status');

    if (error) {
      throw new Error(`Failed to fetch report stats: ${error.message}`);
    }

    const stats = {
      total: data?.length || 0,
      pending: 0,
      reviewed: 0,
      resolved: 0
    };

    data?.forEach(report => {
      stats[report.status as keyof typeof stats]++;
    });

    return stats;
  }
}

export const reportsService = new ReportsService();