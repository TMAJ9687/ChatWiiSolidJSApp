import { supabase } from "../../config/supabase";
import type { User } from "../../types/user.types";
import type { Database } from "../../types/database.types";
import type { Feedback } from "../../types/admin.types";
import type {
  AdminAuditLog,
  AdminActionResult,
  UserAction,
  AdminStats,
  UserSearchFilters,
  ReportWithUsers,
  AdminRetryConfig
} from "../../types/admin.types";
import { createServiceLogger } from "../../utils/logger";

const logger = createServiceLogger('AdminService');

type SupabaseUser = Database['public']['Tables']['users']['Row'];
type SupabaseReport = Database['public']['Tables']['reports']['Row'];

class AdminService {
  private retryConfig: AdminRetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 5000
  };

  // Method to configure retry settings (useful for testing)
  public setRetryConfig(config: Partial<AdminRetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }

  // Audit logging functionality
  private async logAdminAction(
    adminId: string,
    action: string,
    targetType: 'user' | 'setting' | 'bot' | 'ban' | 'report' | 'feedback',
    targetId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from("admin_audit_log")
        .insert({
          admin_id: adminId,
          action,
          target_type: targetType,
          target_id: targetId,
          details: details || {}
        });

      if (error) {
        logger.error("Error logging admin action:", error);
        // Don't throw error for audit logging failures to avoid blocking main operations
      }
    } catch (error) {
      logger.error("Error logging admin action:", error);
    }
  }

  // Retry mechanism for critical operations
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.retryConfig.maxRetries) {
          logger.error(`Operation ${operationName} failed after ${this.retryConfig.maxRetries} retries:`, error);
          throw error;
        }
        
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(2, attempt),
          this.retryConfig.maxDelay
        );
        
        logger.warn(`Operation ${operationName} failed (attempt ${attempt + 1}), retrying in ${delay}ms:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  // Get audit logs with pagination
  async getAuditLogs(
    adminId?: string,
    targetType?: string,
    page = 1,
    limit = 50
  ): Promise<{ logs: AdminAuditLog[]; total: number }> {
    try {
      let query = supabase
        .from("admin_audit_log")
        .select("*", { count: "exact" });

      if (adminId) {
        query = query.eq("admin_id", adminId);
      }
      
      if (targetType) {
        query = query.eq("target_type", targetType);
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      // Order by created_at descending
      query = query.order("created_at", { ascending: false });

      const { data, count, error } = await query;

      if (error) {
        logger.error("Error getting audit logs:", error);
        return { logs: [], total: 0 };
      }

      const logs = (data || []).map(log => ({
        id: log.id,
        adminId: log.admin_id,
        action: log.action,
        targetType: log.target_type as 'user' | 'setting' | 'bot' | 'ban' | 'report' | 'feedback',
        targetId: log.target_id,
        details: log.details,
        createdAt: log.created_at
      }));

      return { logs, total: count || 0 };
    } catch (error) {
      logger.error("Error getting audit logs:", error);
      return { logs: [], total: 0 };
    }
  }

  // Enhanced user action with audit logging
  async performUserAction(action: UserAction): Promise<AdminActionResult> {
    try {
      return await this.withRetry(async () => {
        let result: AdminActionResult;
        
        switch (action.type) {
          case 'kick':
            await this.updateUserStatus(action.userId, 'kicked');
            result = { success: true, message: 'User kicked successfully' };
            break;
            
          case 'ban':
            await this.updateUserStatus(action.userId, 'banned');
            result = { success: true, message: 'User banned successfully' };
            break;
            
          case 'upgrade':
            await this.updateUserRole(action.userId, 'vip');
            result = { success: true, message: 'User upgraded to VIP successfully' };
            break;
            
          case 'downgrade':
            await this.updateUserRole(action.userId, 'standard');
            result = { success: true, message: 'User downgraded to standard successfully' };
            break;
            
          case 'delete':
            await this.deleteUser(action.userId);
            result = { success: true, message: 'User deleted successfully' };
            break;
            
          default:
            result = { success: false, message: 'Unknown action type' };
        }

        // Log the admin action
        if (result.success) {
          await this.logAdminAction(
            action.adminId,
            action.type,
            'user',
            action.userId,
            {
              reason: action.reason,
              duration: action.duration
            }
          );
        }

        return result;
      }, `performUserAction-${action.type}`);
    } catch (error) {
      logger.error(`Error performing user action ${action.type}:`, error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  // Check if current user is admin
  async isAdmin(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

      if (error) {
        logger.error("Error checking admin status:", error);
        return false;
      }

      return data?.role === "admin";
    } catch (error) {
      logger.error("Error checking admin status:", error);
      return false;
    }
  }

  // Get admin dashboard stats
  async getAdminStats(): Promise<AdminStats> {
    try {
      const [usersResult, presenceResult, reportsResult, blocksResult, feedbackResult] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("presence").select("*", { count: "exact", head: true }).eq("online", true),
        supabase.from("reports").select("*", { count: "exact", head: true }),
        supabase.from("blocks").select("*", { count: "exact", head: true }),
        supabase.from("feedback").select("*", { count: "exact", head: true })
      ]);

      const [activeUsersResult, pendingReportsResult, unreadFeedbackResult] = await Promise.all([
        supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("feedback")
          .select("*", { count: "exact", head: true })
          .eq("status", "unread")
      ]);

      return {
        totalUsers: usersResult.count || 0,
        activeUsers: activeUsersResult.count || 0,
        onlineUsers: presenceResult.count || 0,
        totalReports: reportsResult.count || 0,
        pendingReports: pendingReportsResult.count || 0,
        blockedUsers: blocksResult.count || 0,
        totalFeedback: feedbackResult.count || 0,
        unreadFeedback: unreadFeedbackResult.count || 0,
      };
    } catch (error) {
      logger.error("Error getting admin stats:", error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        onlineUsers: 0,
        totalReports: 0,
        pendingReports: 0,
        blockedUsers: 0,
        totalFeedback: 0,
        unreadFeedback: 0,
      };
    }
  }

  // Get users with filters and pagination
  async getUsers(filters: UserSearchFilters = {}, page = 1, limit = 50): Promise<{ users: User[]; total: number }> {
    try {
      let query = supabase
        .from("users")
        .select(`
          *,
          presence:presence(online)
        `, { count: "exact" })
        .not("nickname", "is", null) // Exclude users with null nicknames
        .not("nickname", "eq", "") // Exclude users with empty nicknames
        .neq("nickname", "Deleted User"); // Exclude deleted users

      // Apply filters
      if (filters.search) {
        query = query.ilike("nickname", `%${filters.search}%`);
      }
      if (filters.role) {
        query = query.eq("role", filters.role);
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.gender) {
        query = query.eq("gender", filters.gender);
      }
      if (filters.country) {
        query = query.eq("country", filters.country);
      }
      // For online filter, we need to filter on the joined presence table
      if (filters.onlineOnly) {
        query = query.not("presence", "is", null).eq("presence.online", true);
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      // Order by created_at descending
      query = query.order("created_at", { ascending: false });

      const { data, count, error } = await query;

      if (error) {
        logger.error("Error getting users:", error);
        return { users: [], total: 0 };
      }

      const users = (data || [])
        .filter(user => user && user.nickname && user.nickname.trim() !== "") // Filter out invalid users
        .map(this.convertSupabaseUser);
      return { users, total: count || 0 };
    } catch (error) {
      logger.error("Error getting users:", error);
      return { users: [], total: 0 };
    }
  }

  // Update user status with audit logging
  async updateUserStatus(
    userId: string, 
    status: "active" | "kicked" | "banned",
    adminId?: string,
    reason?: string
  ): Promise<void> {
    try {
      await this.withRetry(async () => {
        // Use the database function for safe user status updates
        let data, error;
        
        if (adminId && reason) {
          // Use version with audit logging
          ({ data, error } = await supabase.rpc('safe_update_user_status', {
            p_user_id: userId,
            p_status: status,
            p_admin_id: adminId,
            p_reason: reason
          }));
        } else {
          // Use simple version without audit logging
          ({ data, error } = await supabase.rpc('safe_update_user_status', {
            p_user_id: userId,
            p_status: status
          }));
        }

        if (error) {
          throw new Error(error.message);
        }

        if (!data) {
          throw new Error('Failed to update user status');
        }
      }, 'updateUserStatus');
    } catch (error) {
      logger.error("Error updating user status:", error);
      throw error;
    }
  }

  // Update user role with audit logging
  async updateUserRole(
    userId: string, 
    role: "standard" | "vip" | "admin",
    adminId?: string,
    duration?: number // VIP duration in days, defaults to 30
  ): Promise<void> {
    try {
      await this.withRetry(async () => {
        // Use the database function for safe user role updates
        const { data, error } = await supabase.rpc('safe_update_user_role', {
          p_user_id: userId,
          p_role: role,
          p_admin_id: adminId || null,
          p_duration_days: role === 'vip' ? (duration || 30) : null
        });

        if (error) {
          throw new Error(error.message);
        }

        if (!data) {
          throw new Error('Failed to update user role');
        }
      }, 'updateUserRole');
    } catch (error) {
      logger.error("Error updating user role:", error);
      throw error;
    }
  }

  // Get reports with pagination
  async getReports(status?: "pending" | "reviewed" | "resolved", page = 1, limit = 50): Promise<{ reports: ReportWithUsers[]; total: number }> {
    try {
      let query = supabase
        .from("reports")
        .select(`
          *,
          reporter:reporter_id (id, nickname, role),
          reported:reported_id (id, nickname, role)
        `, { count: "exact" });

      if (status) {
        query = query.eq("status", status);
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      // Order by created_at descending
      query = query.order("created_at", { ascending: false });

      const { data, count, error } = await query;

      if (error) {
        logger.error("Error getting reports:", error);
        return { reports: [], total: 0 };
      }

      return { reports: data || [], total: count || 0 };
    } catch (error) {
      logger.error("Error getting reports:", error);
      return { reports: [], total: 0 };
    }
  }

  // Update report status with audit logging
  async updateReportStatus(
    reportId: string, 
    status: "reviewed" | "resolved", 
    adminId?: string,
    adminNotes?: string
  ): Promise<void> {
    try {
      await this.withRetry(async () => {
        const updates: any = {
          status,
          resolved_at: new Date().toISOString(),
        };
        
        // Only add admin_notes if it's provided
        if (adminNotes !== undefined) {
          updates.admin_notes = adminNotes;
        }

        const { error } = await supabase
          .from("reports")
          .update(updates)
          .eq("id", reportId);

        if (error) {
          throw new Error(error.message);
        }

        // Log admin action if adminId is provided
        if (adminId) {
          await this.logAdminAction(
            adminId,
            `update_report_status_${status}`,
            'report',
            reportId,
            { status, adminNotes }
          );
        }
      }, 'updateReportStatus');
    } catch (error) {
      logger.error("Error updating report status:", error);
      throw error;
    }
  }

  // Delete user (complete removal) with audit logging
  async deleteUser(userId: string, adminId?: string, reason?: string): Promise<void> {
    try {
      await this.withRetry(async () => {
        // Get user info before deletion for audit log
        const { data: userData } = await supabase
          .from("users")
          .select("nickname, role")
          .eq("id", userId)
          .single();

        // Delete in order due to foreign key constraints
        await Promise.all([
          supabase.from("presence").delete().eq("user_id", userId),
          supabase.from("blocks").delete().or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
          supabase.from("reports").delete().or(`reporter_id.eq.${userId},reported_id.eq.${userId}`),
          supabase.from("typing").delete().eq("user_id", userId),
        ]);

        // Delete messages sent by this user (messages table uses sender_id/receiver_id, not conversations)
        await supabase
          .from("messages")
          .delete()
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

        // Finally delete the user
        const { error } = await supabase
          .from("users")
          .delete()
          .eq("id", userId);

        if (error) {
          throw new Error(error.message);
        }

        // Log admin action if adminId is provided
        if (adminId) {
          await this.logAdminAction(
            adminId,
            'delete_user',
            'user',
            userId,
            { 
              reason,
              deletedUserNickname: userData?.nickname,
              deletedUserRole: userData?.role
            }
          );
        }
      }, 'deleteUser');
    } catch (error) {
      logger.error("Error deleting user:", error);
      throw error;
    }
  }

  // Get user activity stats
  async getUserActivity(userId: string): Promise<{
    messageCount: number;
    reportsReceived: number;
    reportsSubmitted: number;
    blocksReceived: number;
    blocksSubmitted: number;
    lastSeen: string | null;
  }> {
    try {
      const [messagesResult, reportsReceivedResult, reportsSubmittedResult, blocksReceivedResult, blocksSubmittedResult, userResult] = await Promise.all([
        supabase.from("messages").select("*", { count: "exact", head: true }).eq("sender_id", userId),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("reported_id", userId),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("reporter_id", userId),
        supabase.from("blocks").select("*", { count: "exact", head: true }).eq("blocked_id", userId),
        supabase.from("blocks").select("*", { count: "exact", head: true }).eq("blocker_id", userId),
        supabase.from("users").select("last_seen").eq("id", userId).single()
      ]);

      return {
        messageCount: messagesResult.count || 0,
        reportsReceived: reportsReceivedResult.count || 0,
        reportsSubmitted: reportsSubmittedResult.count || 0,
        blocksReceived: blocksReceivedResult.count || 0,
        blocksSubmitted: blocksSubmittedResult.count || 0,
        lastSeen: userResult.data?.last_seen || null,
      };
    } catch (error) {
      logger.error("Error getting user activity:", error);
      return {
        messageCount: 0,
        reportsReceived: 0,
        reportsSubmitted: 0,
        blocksReceived: 0,
        blocksSubmitted: 0,
        lastSeen: null,
      };
    }
  }

  // Convert Supabase user format to app format
  private convertSupabaseUser(supabaseUser: any): User {
    // Use presence data for accurate online status if available, fallback to user.online
    const online = supabaseUser.presence?.online ?? supabaseUser.online ?? false;
    
    return {
      id: supabaseUser.id,
      nickname: supabaseUser.nickname,
      role: supabaseUser.role,
      gender: supabaseUser.gender,
      age: supabaseUser.age,
      country: supabaseUser.country,
      avatar: supabaseUser.avatar,
      createdAt: supabaseUser.created_at,
      status: supabaseUser.status,
      lastSeen: supabaseUser.last_seen ? Date.parse(supabaseUser.last_seen) : undefined,
      online: online,
      vipExpiresAt: supabaseUser.vip_expires_at,
    };
  }

  // Get feedback with filters and pagination (admin only)
  async getFeedback(
    status?: 'pending' | 'read' | 'in_progress' | 'resolved',
    page = 1,
    limit = 50
  ): Promise<{ feedback: Feedback[]; total: number }> {
    try {
      let query = supabase
        .from("feedback")
        .select("*", { count: "exact" });

      // Filter by status if provided
      if (status) {
        query = query.eq("status", status);
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      // Order by created_at descending (newest first)
      query = query.order("created_at", { ascending: false });

      const { data, count, error } = await query;

      if (error) {
        logger.error("Error getting feedback:", error);
        return { feedback: [], total: 0 };
      }

      // Map database fields to interface
      const mappedFeedback = (data || []).map(item => ({
        ...item,
        message: item.feedback_text || item.message, // Map feedback_text to message
        subject: item.subject || 'No subject', // Provide default subject if missing
      }));

      return { feedback: mappedFeedback, total: count || 0 };
    } catch (error) {
      logger.error("Error getting feedback:", error);
      return { feedback: [], total: 0 };
    }
  }

  // Update feedback status (admin only) with audit logging
  async updateFeedbackStatus(
    feedbackId: string, 
    status: 'pending' | 'read' | 'in_progress' | 'resolved',
    adminId?: string,
    adminNotes?: string
  ): Promise<void> {
    try {
      await this.withRetry(async () => {
        const updates: any = { status };
        
        if (adminNotes !== undefined) {
          updates.admin_notes = adminNotes;
        }

        const { error } = await supabase
          .from("feedback")
          .update(updates)
          .eq("id", feedbackId);

        if (error) {
          throw new Error(error.message);
        }

        // Log admin action if adminId is provided
        if (adminId) {
          await this.logAdminAction(
            adminId,
            `update_feedback_status_${status}`,
            'feedback',
            feedbackId,
            { status, adminNotes }
          );
        }
      }, 'updateFeedbackStatus');
    } catch (error) {
      logger.error("Error updating feedback status:", error);
      throw error;
    }
  }

  // Delete feedback (admin only) with audit logging
  async deleteFeedback(feedbackId: string, adminId?: string, reason?: string): Promise<void> {
    try {
      await this.withRetry(async () => {
        // Get feedback info before deletion for audit log
        const { data: feedbackData } = await supabase
          .from("feedback")
          .select("feedback_text, status")
          .eq("id", feedbackId)
          .single();

        const { error } = await supabase
          .from("feedback")
          .delete()
          .eq("id", feedbackId);

        if (error) {
          throw new Error(error.message);
        }

        // Log admin action if adminId is provided
        if (adminId) {
          await this.logAdminAction(
            adminId,
            'delete_feedback',
            'feedback',
            feedbackId,
            { 
              reason,
              deletedFeedbackText: feedbackData?.feedback_text,
              deletedFeedbackStatus: feedbackData?.status
            }
          );
        }
      }, 'deleteFeedback');
    } catch (error) {
      logger.error("Error deleting feedback:", error);
      throw error;
    }
  }
}

export const adminService = new AdminService();