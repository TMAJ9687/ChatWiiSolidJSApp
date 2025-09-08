import { supabase } from "../../config/supabase";
import type { Database } from "../../types/database.types";

type SupabaseReport = Database['public']['Tables']['reports']['Row'];
type SupabaseReportInsert = Database['public']['Tables']['reports']['Insert'];

export type ReportReason = 'under_age' | 'abusive' | 'scams' | 'spam' | 'inappropriate' | 'other';

export interface ReportData {
  reason: ReportReason;
  customReason?: string;
}

export interface ReportSummary {
  id: string;
  reporterId: string;
  reportedId: string;
  reason: ReportReason;
  customReason?: string;
  createdAt: string;
  status: 'pending' | 'reviewed' | 'resolved';
  resolvedAt?: string;
  adminNotes?: string;
}

class ReportingService {
  /**
   * Submit a report against a user
   */
  async submitReport(reportedUserId: string, reportData: ReportData): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    if (user.id === reportedUserId) {
      throw new Error('Cannot report yourself');
    }

    // Validate custom reason if provided
    if (reportData.reason === 'other' && (!reportData.customReason || reportData.customReason.trim().length === 0)) {
      throw new Error('Custom reason is required when selecting "Other"');
    }

    if (reportData.customReason && reportData.customReason.length > 100) {
      throw new Error('Custom reason cannot exceed 100 characters');
    }

    try {
      const reportInsert: SupabaseReportInsert = {
        reporter_id: user.id,
        reported_id: reportedUserId,
        reason: reportData.reason,
        description: reportData.reason === 'other' ? reportData.customReason : null
      };

      const { error } = await supabase
        .from('reports')
        .insert([reportInsert]);

      if (error) {
        // Check if it's a unique constraint error (already reported)
        if (error.code === '23505') {
          throw new Error('You have already reported this user');
        }
        throw error;
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      throw error;
    }
  }

  /**
   * Check if current user has already reported a specific user
   */
  async hasUserBeenReported(reportedUserId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id === reportedUserId) return false;

    try {
      const { data, error } = await supabase
        .from('reports')
        .select('id')
        .eq('reporter_id', user.id)
        .eq('reported_id', reportedUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking report status:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking if user has been reported:', error);
      return false;
    }
  }

  /**
   * Get user's submitted reports
   */
  async getUserReports(): Promise<ReportSummary[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('reporter_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map((report: SupabaseReport) => ({
        id: report.id,
        reporterId: report.reporter_id,
        reportedId: report.reported_id,
        reason: report.reason as ReportReason,
        customReason: report.description || undefined,
        createdAt: report.created_at,
        status: report.status,
        resolvedAt: report.resolved_at || undefined,
        adminNotes: report.admin_notes || undefined
      }));
    } catch (error) {
      console.error('Error getting user reports:', error);
      return [];
    }
  }

  /**
   * Get all reports (admin function)
   */
  async getAllReports(): Promise<ReportSummary[]> {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map((report: SupabaseReport) => ({
        id: report.id,
        reporterId: report.reporter_id,
        reportedId: report.reported_id,
        reason: report.reason as ReportReason,
        customReason: report.description || undefined,
        createdAt: report.created_at,
        status: report.status,
        resolvedAt: report.resolved_at || undefined,
        adminNotes: report.admin_notes || undefined
      }));
    } catch (error) {
      console.error('Error getting all reports:', error);
      return [];
    }
  }

  /**
   * Mark report as reviewed (admin function)
   */
  async markReportAsReviewed(reportId: string, adminNotes?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status: 'reviewed',
          resolved_at: new Date().toISOString(),
          admin_notes: adminNotes || null
        })
        .eq('id', reportId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error marking report as reviewed:', error);
      throw error;
    }
  }

  /**
   * Get report statistics (admin function)
   */
  async getReportStats(): Promise<{
    totalReports: number;
    pendingReports: number;
    reportsByReason: Record<ReportReason, number>;
  }> {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('reason, status');

      if (error) {
        throw error;
      }

      const reports = data || [];
      const totalReports = reports.length;
      const pendingReports = reports.filter(r => r.status === 'pending').length;
      
      const reportsByReason: Record<ReportReason, number> = {
        under_age: 0,
        abusive: 0,
        scams: 0,
        spam: 0,
        inappropriate: 0,
        other: 0
      };

      reports.forEach(report => {
        const reason = report.reason as ReportReason;
        reportsByReason[reason]++;
      });

      return {
        totalReports,
        pendingReports,
        reportsByReason
      };
    } catch (error) {
      console.error('Error getting report stats:', error);
      return {
        totalReports: 0,
        pendingReports: 0,
        reportsByReason: {
          under_age: 0,
          abusive: 0,
          scams: 0,
          spam: 0,
          inappropriate: 0,
          other: 0
        }
      };
    }
  }

  /**
   * Clean up expired reports (admin function)
   */
  async cleanupResolvedReports(daysOld = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const { data, error } = await supabase
        .from('reports')
        .delete()
        .eq('status', 'resolved')
        .lt('resolved_at', cutoffDate.toISOString());

      if (error) {
        throw error;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error cleaning up resolved reports:', error);
      return 0;
    }
  }

  /**
   * Get reason display text
   */
  getReasonDisplayText(reason: ReportReason): string {
    const reasonTexts: Record<ReportReason, string> = {
      under_age: 'Under Age (less than 18)',
      abusive: 'Abusive/Threatening/Hateful Behavior',
      scams: 'Financial Scams/Fraud',
      spam: 'Unsolicited Spam Messages',
      inappropriate: 'Inappropriate/Explicit Content',
      other: 'Other Reason'
    };

    return reasonTexts[reason] || reason;
  }
}

export const reportingService = new ReportingService();