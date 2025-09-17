import { supabase } from "../../config/supabase";
import type { AdminActionResult } from "../../types/admin.types";
import { createServiceLogger } from "../../utils/logger";

const logger = createServiceLogger('KickService');

export interface KickNotification {
  userId: string;
  reason?: string;
  kickedBy: string;
  kickedAt: string;
}

export interface KickStatus {
  userId: string;
  isKicked: boolean;
  kickedAt?: string;
  kickedBy?: string;
  reason?: string;
  expiresAt?: string; // Auto-expiry after 24 hours
}

class KickService {
  private readonly KICK_EXPIRY_HOURS = 24;
  private readonly KICK_CHANNEL = 'user_kicks';

  // Kick a user with real-time notification
  async kickUser(
    userId: string, 
    adminId: string, 
    reason?: string
  ): Promise<AdminActionResult> {
    try {
      const kickedAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + this.KICK_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

      // Use the admin transaction function for secure kick operation
      const { data, error } = await supabase.rpc('admin_kick_user_transaction', {
        p_user_id: userId,
        p_admin_id: adminId,
        p_reason: reason || 'No reason provided',
        p_expires_at: expiresAt
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.message || 'Failed to kick user');
      }

      // The admin transaction function handles all the database updates
      // Now handle the real-time notifications and caching
      
      // Store kick status with expiry
      await this.setKickStatus(userId, {
        userId,
        isKicked: true,
        kickedAt,
        kickedBy: adminId,
        reason,
        expiresAt
      });

      // Broadcast kick notification to user's active sessions
      await this.broadcastKickToUser(userId, {
        userId,
        reason,
        kickedBy: adminId,
        kickedAt
      });

      // Schedule auto-expiry cleanup
      this.scheduleKickExpiry(userId, expiresAt);

      return {
        success: true,
        message: 'User kicked successfully',
        data: { userId, kickedAt, expiresAt }
      };
    } catch (error) {
      logger.error("Error kicking user:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to kick user'
      };
    }
  }

  // Broadcast kick notification to user's active sessions
  private async broadcastKickToUser(userId: string, notification: KickNotification): Promise<void> {
    try {
      const { error } = await supabase
        .channel(this.KICK_CHANNEL)
        .send({
          type: 'broadcast',
          event: 'user_kicked',
          payload: {
            ...notification,
            targetUserId: userId
          }
        });

      if (error) {
        logger.error("Error broadcasting kick notification:", error);
      }
    } catch (error) {
      logger.error("Error broadcasting kick notification:", error);
    }
  }

  // Set kick status in temporary storage (could use Redis in production)
  private async setKickStatus(userId: string, status: KickStatus): Promise<void> {
    try {
      // For now, we'll store in a simple table or localStorage
      // In production, this should be Redis or similar
      const kickData = {
        user_id: userId,
        is_kicked: status.isKicked,
        kicked_at: status.kickedAt,
        kicked_by: status.kickedBy,
        reason: status.reason,
        expires_at: status.expiresAt
      };

      // Try to insert or update kick status
      const { error } = await supabase
        .from("user_kick_status")
        .upsert(kickData, { onConflict: 'user_id' });

      if (error) {
        logger.warn("Error storing kick status:", error);
        // Store in memory as fallback
        this.storeKickStatusInMemory(userId, status);
      }
    } catch (error) {
      logger.warn("Error storing kick status:", error);
      this.storeKickStatusInMemory(userId, status);
    }
  }

  // Fallback in-memory storage for kick status
  private kickStatusCache = new Map<string, KickStatus>();

  private storeKickStatusInMemory(userId: string, status: KickStatus): void {
    this.kickStatusCache.set(userId, status);
  }

  // Get kick status for a user
  async getKickStatus(userId: string): Promise<KickStatus | null> {
    try {
      // Try database first
      const { data, error } = await supabase
        .from("user_kick_status")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!error && data) {
        const status: KickStatus = {
          userId: data.user_id,
          isKicked: data.is_kicked,
          kickedAt: data.kicked_at,
          kickedBy: data.kicked_by,
          reason: data.reason,
          expiresAt: data.expires_at
        };

        // Check if kick has expired
        if (status.expiresAt && new Date(status.expiresAt) < new Date()) {
          await this.clearKickStatus(userId);
          return null;
        }

        return status;
      }

      // Fallback to memory cache
      const cachedStatus = this.kickStatusCache.get(userId);
      if (cachedStatus) {
        // Check if kick has expired
        if (cachedStatus.expiresAt && new Date(cachedStatus.expiresAt) < new Date()) {
          this.kickStatusCache.delete(userId);
          return null;
        }
        return cachedStatus;
      }

      return null;
    } catch (error) {
      logger.error("Error getting kick status:", error);
      return null;
    }
  }

  // Clear kick status (when user rejoins or kick expires)
  async clearKickStatus(userId: string): Promise<void> {
    try {
      // Clear from database
      await supabase
        .from("user_kick_status")
        .delete()
        .eq("user_id", userId);

      // Clear from memory cache
      this.kickStatusCache.delete(userId);

      // Update user status back to active if they're not banned
      const { data: userData } = await supabase
        .from("users")
        .select("status")
        .eq("id", userId)
        .single();

      if (userData && userData.status === 'kicked') {
        await supabase
          .from("users")
          .update({ status: 'active' })
          .eq("id", userId);
      }
    } catch (error) {
      logger.error("Error clearing kick status:", error);
    }
  }

  // Check if user is currently kicked
  async isUserKicked(userId: string): Promise<boolean> {
    const kickStatus = await this.getKickStatus(userId);
    return kickStatus?.isKicked || false;
  }

  // Schedule automatic kick expiry cleanup
  private scheduleKickExpiry(userId: string, expiresAt: string): void {
    const expiryTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const delay = expiryTime - now;

    if (delay > 0) {
      setTimeout(async () => {
        await this.clearKickStatus(userId);
        logger.debug(`Kick status expired for user ${userId}`);
      }, delay);
    }
  }

  // Subscribe to kick notifications (for client-side)
  subscribeToKickNotifications(
    userId: string,
    onKicked: (notification: KickNotification) => void
  ): () => void {
    const channel = supabase
      .channel(`kick_notifications_${userId}`)
      .on('broadcast', { event: 'user_kicked' }, (payload) => {
        if (payload.payload.targetUserId === userId) {
          onKicked(payload.payload);
        }
      })
      .subscribe();

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Bulk kick multiple users
  async kickMultipleUsers(
    userIds: string[],
    adminId: string,
    reason?: string
  ): Promise<AdminActionResult[]> {
    const results: AdminActionResult[] = [];

    for (const userId of userIds) {
      const result = await this.kickUser(userId, adminId, reason);
      results.push(result);
    }

    return results;
  }

  // Get all currently kicked users
  async getKickedUsers(): Promise<KickStatus[]> {
    try {
      const { data, error } = await supabase
        .from("user_kick_status")
        .select("*")
        .eq("is_kicked", true);

      if (error) {
        logger.error("Error getting kicked users:", error);
        return [];
      }

      const kickedUsers: KickStatus[] = (data || []).map(row => ({
        userId: row.user_id,
        isKicked: row.is_kicked,
        kickedAt: row.kicked_at,
        kickedBy: row.kicked_by,
        reason: row.reason,
        expiresAt: row.expires_at
      }));

      // Filter out expired kicks
      const activeKicks = kickedUsers.filter(kick => {
        if (kick.expiresAt && new Date(kick.expiresAt) < new Date()) {
          this.clearKickStatus(kick.userId);
          return false;
        }
        return true;
      });

      return activeKicks;
    } catch (error) {
      logger.error("Error getting kicked users:", error);
      return [];
    }
  }

  // Cleanup expired kicks (should be called periodically)
  async cleanupExpiredKicks(): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      // Get expired kicks
      const { data: expiredKicks } = await supabase
        .from("user_kick_status")
        .select("user_id")
        .lt("expires_at", now);

      if (expiredKicks && expiredKicks.length > 0) {
        // Clear expired kicks
        for (const kick of expiredKicks) {
          await this.clearKickStatus(kick.user_id);
        }
        
        logger.debug(`Cleaned up ${expiredKicks.length} expired kicks`);
      }
    } catch (error) {
      logger.error("Error cleaning up expired kicks:", error);
    }
  }
}

export const kickService = new KickService();