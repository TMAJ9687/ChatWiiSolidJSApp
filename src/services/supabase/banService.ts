import { supabase } from "../../config/supabase";
import type { AdminActionResult } from "../../types/admin.types";

export interface Ban {
  id: string;
  userId?: string;
  ipAddress?: string;
  reason: string;
  durationHours?: number; // null for permanent
  bannedBy: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface BanCreateRequest {
  userId?: string;
  ipAddress?: string;
  reason: string;
  durationHours?: number; // null for permanent ban
  bannedBy: string;
}

class BanService {
  // Ban a user by ID
  async banUser(
    userId: string,
    adminId: string,
    reason: string,
    durationHours?: number
  ): Promise<AdminActionResult> {
    try {
      const banRequest: BanCreateRequest = {
        userId,
        reason,
        durationHours,
        bannedBy: adminId
      };

      // The database function handles both ban creation and user status update
      return await this.createBan(banRequest);
    } catch (error) {
      console.error("Error banning user:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to ban user'
      };
    }
  }

  // Ban an IP address
  async banIP(
    ipAddress: string,
    adminId: string,
    reason: string,
    durationHours?: number
  ): Promise<AdminActionResult> {
    try {
      const banRequest: BanCreateRequest = {
        ipAddress,
        reason,
        durationHours,
        bannedBy: adminId
      };

      return await this.createBan(banRequest);
    } catch (error) {
      console.error("Error banning IP:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to ban IP'
      };
    }
  }

  // Create a ban record
  private async createBan(banRequest: BanCreateRequest): Promise<AdminActionResult> {
    try {
      // Use the database function for creating bans
      const { data: banId, error } = await supabase.rpc('create_ban_record', {
        p_admin_id: banRequest.bannedBy,
        p_reason: banRequest.reason,
        p_user_id: banRequest.userId || null,
        p_ip_address: banRequest.ipAddress || null,
        p_duration_hours: banRequest.durationHours || null
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!banId) {
        throw new Error('Failed to create ban record');
      }

      // Get the created ban record for return data
      const { data: banRecord, error: fetchError } = await supabase
        .from("bans")
        .select("*")
        .eq("id", banId)
        .single();

      if (fetchError) {
        console.warn("Ban created but failed to fetch record:", fetchError);
      }

      return {
        success: true,
        message: banRequest.userId ? 'User banned successfully' : 'IP banned successfully',
        data: banRecord ? this.convertToBan(banRecord) : undefined
      };
    } catch (error) {
      console.error("Error creating ban:", error);
      throw error;
    }
  }

  // Update user status to banned and set offline
  private async updateUserStatusToBanned(userId: string): Promise<void> {
    try {
      const now = new Date().toISOString();

      // Update user status and set offline
      await Promise.all([
        supabase
          .from("users")
          .update({ 
            status: 'banned',
            online: false,
            last_seen: now
          })
          .eq("id", userId),
        supabase
          .from("presence")
          .update({ 
            online: false, 
            last_seen: now 
          })
          .eq("user_id", userId)
      ]);
    } catch (error) {
      console.error("Error updating user status to banned:", error);
      // Don't throw error here to avoid failing the ban operation
    }
  }

  // Unban a user
  async unbanUser(userId: string, adminId: string): Promise<AdminActionResult> {
    try {
      // Deactivate all active bans for this user
      const { error: banError } = await supabase
        .from("bans")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("is_active", true);

      if (banError) {
        throw new Error(banError.message);
      }

      // Update user status back to active
      const { error: userError } = await supabase
        .from("users")
        .update({ status: 'active' })
        .eq("id", userId);

      if (userError) {
        throw new Error(userError.message);
      }

      return {
        success: true,
        message: 'User unbanned successfully'
      };
    } catch (error) {
      console.error("Error unbanning user:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to unban user'
      };
    }
  }

  // Unban an IP address
  async unbanIP(ipAddress: string, adminId: string): Promise<AdminActionResult> {
    try {
      const { error } = await supabase
        .from("bans")
        .update({ is_active: false })
        .eq("ip_address", ipAddress)
        .eq("is_active", true);

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        message: 'IP unbanned successfully'
      };
    } catch (error) {
      console.error("Error unbanning IP:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to unban IP'
      };
    }
  }

  // Check if a user is banned
  async isUserBanned(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("bans")
        .select("id, expires_at")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(1);

      if (error) {
        console.error("Error checking user ban status:", error);
        return false;
      }

      if (!data || data.length === 0) {
        return false;
      }

      const ban = data[0];
      
      // Check if ban has expired
      if (ban.expires_at && new Date(ban.expires_at) < new Date()) {
        await this.expireBan(ban.id);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error checking user ban status:", error);
      return false;
    }
  }

  // Check if an IP is banned
  async isIPBanned(ipAddress: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("bans")
        .select("id, expires_at")
        .eq("ip_address", ipAddress)
        .eq("is_active", true)
        .limit(1);

      if (error) {
        console.error("Error checking IP ban status:", error);
        return false;
      }

      if (!data || data.length === 0) {
        return false;
      }

      const ban = data[0];
      
      // Check if ban has expired
      if (ban.expires_at && new Date(ban.expires_at) < new Date()) {
        await this.expireBan(ban.id);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error checking IP ban status:", error);
      return false;
    }
  }

  // Get all active bans with pagination
  async getActiveBans(page = 1, limit = 50): Promise<{ bans: Ban[]; total: number }> {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, count, error } = await supabase
        .from("bans")
        .select("*", { count: "exact" })
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("Error getting active bans:", error);
        return { bans: [], total: 0 };
      }

      const bans = (data || []).map(this.convertToBan);
      
      // Filter out expired bans and clean them up
      const activeBans = await this.filterAndCleanExpiredBans(bans);

      return { bans: activeBans, total: count || 0 };
    } catch (error) {
      console.error("Error getting active bans:", error);
      return { bans: [], total: 0 };
    }
  }

  // Get ban history for a user
  async getUserBanHistory(userId: string): Promise<Ban[]> {
    try {
      const { data, error } = await supabase
        .from("bans")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error getting user ban history:", error);
        return [];
      }

      return (data || []).map(this.convertToBan);
    } catch (error) {
      console.error("Error getting user ban history:", error);
      return [];
    }
  }

  // Get ban history for an IP
  async getIPBanHistory(ipAddress: string): Promise<Ban[]> {
    try {
      const { data, error } = await supabase
        .from("bans")
        .select("*")
        .eq("ip_address", ipAddress)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error getting IP ban history:", error);
        return [];
      }

      return (data || []).map(this.convertToBan);
    } catch (error) {
      console.error("Error getting IP ban history:", error);
      return [];
    }
  }

  // Expire a ban (mark as inactive and update user status if needed)
  private async expireBan(banId: string): Promise<void> {
    try {
      // Get ban details before expiring
      const { data: banData } = await supabase
        .from("bans")
        .select("user_id")
        .eq("id", banId)
        .single();

      // Mark ban as inactive
      await supabase
        .from("bans")
        .update({ is_active: false })
        .eq("id", banId);

      // If it's a user ban, check if there are other active bans
      if (banData?.user_id) {
        const { data: otherBans } = await supabase
          .from("bans")
          .select("id")
          .eq("user_id", banData.user_id)
          .eq("is_active", true)
          .limit(1);

        // If no other active bans, restore user to active status
        if (!otherBans || otherBans.length === 0) {
          await supabase
            .from("users")
            .update({ status: 'active' })
            .eq("id", banData.user_id);
        }
      }

      console.log(`Ban ${banId} expired and cleaned up`);
    } catch (error) {
      console.error("Error expiring ban:", error);
    }
  }

  // Schedule automatic ban expiry
  private scheduleBanExpiry(banId: string, expiresAt: string): void {
    const expiryTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const delay = expiryTime - now;

    if (delay > 0) {
      setTimeout(async () => {
        await this.expireBan(banId);
      }, delay);
    }
  }

  // Filter out expired bans and clean them up
  private async filterAndCleanExpiredBans(bans: Ban[]): Promise<Ban[]> {
    const activeBans: Ban[] = [];
    const now = new Date();

    for (const ban of bans) {
      if (ban.expiresAt && new Date(ban.expiresAt) < now) {
        // Ban has expired, clean it up
        await this.expireBan(ban.id);
      } else {
        activeBans.push(ban);
      }
    }

    return activeBans;
  }

  // Cleanup expired bans (should be called periodically)
  async cleanupExpiredBans(): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      // Get expired bans
      const { data: expiredBans } = await supabase
        .from("bans")
        .select("id")
        .eq("is_active", true)
        .lt("expires_at", now);

      if (expiredBans && expiredBans.length > 0) {
        // Expire each ban
        for (const ban of expiredBans) {
          await this.expireBan(ban.id);
        }
        
        console.log(`Cleaned up ${expiredBans.length} expired bans`);
      }
    } catch (error) {
      console.error("Error cleaning up expired bans:", error);
    }
  }

  // Convert database row to Ban interface
  private convertToBan(data: any): Ban {
    return {
      id: data.id,
      userId: data.user_id,
      ipAddress: data.ip_address,
      reason: data.reason,
      durationHours: data.duration_hours,
      bannedBy: data.banned_by,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
      isActive: data.is_active
    };
  }

  // Bulk ban multiple users
  async banMultipleUsers(
    userIds: string[],
    adminId: string,
    reason: string,
    durationHours?: number
  ): Promise<AdminActionResult[]> {
    const results: AdminActionResult[] = [];

    for (const userId of userIds) {
      const result = await this.banUser(userId, adminId, reason, durationHours);
      results.push(result);
    }

    return results;
  }

  // Bulk ban multiple IPs
  async banMultipleIPs(
    ipAddresses: string[],
    adminId: string,
    reason: string,
    durationHours?: number
  ): Promise<AdminActionResult[]> {
    const results: AdminActionResult[] = [];

    for (const ipAddress of ipAddresses) {
      const result = await this.banIP(ipAddress, adminId, reason, durationHours);
      results.push(result);
    }

    return results;
  }

  // Get ban statistics
  async getBanStatistics(): Promise<{
    totalActiveBans: number;
    userBans: number;
    ipBans: number;
    permanentBans: number;
    temporaryBans: number;
  }> {
    try {
      const [totalResult, userBansResult, ipBansResult, permanentResult, temporaryResult] = await Promise.all([
        supabase.from("bans").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("bans").select("*", { count: "exact", head: true }).eq("is_active", true).not("user_id", "is", null),
        supabase.from("bans").select("*", { count: "exact", head: true }).eq("is_active", true).not("ip_address", "is", null),
        supabase.from("bans").select("*", { count: "exact", head: true }).eq("is_active", true).is("expires_at", null),
        supabase.from("bans").select("*", { count: "exact", head: true }).eq("is_active", true).not("expires_at", "is", null)
      ]);

      return {
        totalActiveBans: totalResult.count || 0,
        userBans: userBansResult.count || 0,
        ipBans: ipBansResult.count || 0,
        permanentBans: permanentResult.count || 0,
        temporaryBans: temporaryResult.count || 0
      };
    } catch (error) {
      console.error("Error getting ban statistics:", error);
      return {
        totalActiveBans: 0,
        userBans: 0,
        ipBans: 0,
        permanentBans: 0,
        temporaryBans: 0
      };
    }
  }
}

export const banService = new BanService();