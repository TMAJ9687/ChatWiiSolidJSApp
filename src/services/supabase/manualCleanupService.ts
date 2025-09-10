import { supabase } from "../../config/supabase";
import { presenceService } from "./presenceService";

/**
 * Manual cleanup service for testing and admin use
 * Provides simple, reliable cleanup functions with detailed logging
 */
class ManualCleanupService {
  
  /**
   * Get all users currently in the users table with their status
   */
  async getAllUsers(): Promise<{
    totalUsers: number;
    onlineUsers: number;
    standardUsers: number;
    vipUsers: number;
    adminUsers: number;
    users: any[];
  }> {
    try {
      const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching users:", error);
        throw error;
      }

      const stats = {
        totalUsers: users?.length || 0,
        onlineUsers: users?.filter(u => u.online).length || 0,
        standardUsers: users?.filter(u => u.role === 'standard').length || 0,
        vipUsers: users?.filter(u => u.role === 'vip').length || 0,
        adminUsers: users?.filter(u => u.role === 'admin').length || 0,
        users: users || []
      };

      console.log("User stats:", stats);
      return stats;
    } catch (error) {
      console.error("Error in getAllUsers:", error);
      throw error;
    }
  }

  /**
   * Get all presence records
   */
  async getAllPresence(): Promise<any[]> {
    try {
      const { data: presence, error } = await supabase
        .from("presence")
        .select("*")
        .order("last_seen", { ascending: false });

      if (error) {
        console.error("Error fetching presence:", error);
        throw error;
      }

      console.log(`Found ${presence?.length || 0} presence records`);
      return presence || [];
    } catch (error) {
      console.error("Error in getAllPresence:", error);
      throw error;
    }
  }

  /**
   * Clean up offline standard users (safe cleanup)
   */
  async cleanupOfflineStandardUsers(): Promise<{
    success: boolean;
    message: string;
    deletedCount: number;
    details: string[];
  }> {
    const details: string[] = [];
    let deletedCount = 0;

    try {
      details.push("Starting cleanup of offline standard users...");

      // Get offline standard users
      const { data: offlineStandardUsers, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "standard")
        .eq("online", false);

      if (error) {
        throw error;
      }

      if (!offlineStandardUsers || offlineStandardUsers.length === 0) {
        return {
          success: true,
          message: "No offline standard users found to cleanup",
          deletedCount: 0,
          details: ["No offline standard users found"]
        };
      }

      details.push(`Found ${offlineStandardUsers.length} offline standard users to cleanup`);

      // Clean up each user
      for (const user of offlineStandardUsers) {
        try {
          details.push(`Cleaning up user: ${user.nickname} (${user.id})`);

          // 1. Delete user's messages
          const { error: messagesError } = await supabase
            .from("messages")
            .delete()
            .eq("sender_id", user.id);

          if (messagesError) {
            details.push(`Warning: Error deleting messages for ${user.nickname}: ${messagesError.message}`);
          } else {
            details.push(`✓ Deleted messages for ${user.nickname}`);
          }

          // 2. Delete conversations
          const { error: conversationsError } = await supabase
            .from("conversations")
            .delete()
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

          if (conversationsError) {
            details.push(`Warning: Error deleting conversations for ${user.nickname}: ${conversationsError.message}`);
          } else {
            details.push(`✓ Deleted conversations for ${user.nickname}`);
          }

          // 3. Delete blocks
          const { error: blocksError } = await supabase
            .from("blocks")
            .delete()
            .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

          if (blocksError) {
            details.push(`Warning: Error deleting blocks for ${user.nickname}: ${blocksError.message}`);
          } else {
            details.push(`✓ Deleted blocks for ${user.nickname}`);
          }

          // 4. Delete reports
          const { error: reportsError } = await supabase
            .from("reports")
            .delete()
            .or(`reporter_id.eq.${user.id},reported_user_id.eq.${user.id}`);

          if (reportsError) {
            details.push(`Warning: Error deleting reports for ${user.nickname}: ${reportsError.message}`);
          } else {
            details.push(`✓ Deleted reports for ${user.nickname}`);
          }

          // 5. Delete from presence
          const { error: presenceError } = await supabase
            .from("presence")
            .delete()
            .eq("user_id", user.id);

          if (presenceError) {
            details.push(`Warning: Error deleting presence for ${user.nickname}: ${presenceError.message}`);
          } else {
            details.push(`✓ Deleted presence for ${user.nickname}`);
          }

          // 6. Delete from users table
          const { error: userError } = await supabase
            .from("users")
            .delete()
            .eq("id", user.id);

          if (userError) {
            details.push(`❌ Error deleting user ${user.nickname}: ${userError.message}`);
          } else {
            details.push(`✅ Successfully deleted user ${user.nickname}`);
            deletedCount++;
          }

        } catch (userError) {
          details.push(`❌ Error processing user ${user.nickname}: ${userError.message || 'Unknown error'}`);
        }
      }

      return {
        success: true,
        message: `Cleanup completed: ${deletedCount}/${offlineStandardUsers.length} users deleted`,
        deletedCount,
        details
      };

    } catch (error) {
      details.push(`❌ Fatal error during cleanup: ${error.message || 'Unknown error'}`);
      return {
        success: false,
        message: `Cleanup failed: ${error.message || 'Unknown error'}`,
        deletedCount,
        details
      };
    }
  }

  /**
   * Force all standard users offline (emergency cleanup)
   */
  async forceAllStandardUsersOffline(): Promise<{
    success: boolean;
    message: string;
    affectedCount: number;
  }> {
    try {
      // Set all standard users to offline
      const { data, error } = await supabase
        .from("users")
        .update({ 
          online: false,
          last_seen: new Date().toISOString()
        })
        .eq("role", "standard")
        .eq("online", true)
        .select("id, nickname");

      if (error) {
        throw error;
      }

      // Also clear their presence
      await supabase
        .from("presence")
        .delete()
        .in("user_id", (data || []).map(u => u.id));

      return {
        success: true,
        message: `Forced ${data?.length || 0} standard users offline`,
        affectedCount: data?.length || 0
      };

    } catch (error) {
      return {
        success: false,
        message: `Error forcing users offline: ${error.message || 'Unknown error'}`,
        affectedCount: 0
      };
    }
  }

  /**
   * Clear all presence records (nuclear option)
   */
  async clearAllPresence(): Promise<{
    success: boolean;
    message: string;
    deletedCount: number;
  }> {
    try {
      const { data, error } = await supabase
        .from("presence")
        .delete()
        .neq("user_id", ""); // Delete all records

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: "All presence records cleared",
        deletedCount: (data as any)?.length || 0
      };

    } catch (error) {
      return {
        success: false,
        message: `Error clearing presence: ${error.message || 'Unknown error'}`,
        deletedCount: 0
      };
    }
  }

  /**
   * Test cleanup with detailed logging
   */
  async testCleanup(): Promise<string[]> {
    const logs: string[] = [];
    
    try {
      logs.push("=== CLEANUP TEST STARTED ===");
      logs.push(`Timestamp: ${new Date().toISOString()}`);

      // Check users table
      const userStats = await this.getAllUsers();
      logs.push(`Users in database: ${userStats.totalUsers}`);
      logs.push(`- Standard: ${userStats.standardUsers} (online: ${userStats.users.filter(u => u.role === 'standard' && u.online).length})`);
      logs.push(`- VIP: ${userStats.vipUsers}`);
      logs.push(`- Admin: ${userStats.adminUsers}`);

      // Check presence table
      const presenceRecords = await this.getAllPresence();
      logs.push(`Presence records: ${presenceRecords.length}`);

      // Check for orphaned records
      const orphanedPresence = presenceRecords.filter(p => 
        !userStats.users.find(u => u.id === p.user_id)
      );
      logs.push(`Orphaned presence records: ${orphanedPresence.length}`);

      logs.push("=== CLEANUP TEST COMPLETED ===");

    } catch (error) {
      logs.push(`❌ Test failed: ${error.message || 'Unknown error'}`);
    }

    return logs;
  }
}

export const manualCleanupService = new ManualCleanupService();