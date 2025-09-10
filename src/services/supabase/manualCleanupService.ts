import { supabase } from "../../config/supabase";
import { presenceService } from "./presenceService";

/**
 * Manual cleanup service for testing and admin use
 * Provides simple, reliable cleanup functions with detailed logging
 */
class ManualCleanupService {
  
  /**
   * Check which tables exist in the database
   */
  private async checkTableExists(tableName: string): Promise<boolean> {
    try {
      await supabase
        .from(tableName)
        .select("*")
        .limit(0);
      return true;
    } catch (error) {
      return false;
    }
  }

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

          // 1. Delete user's messages (with error handling)
          try {
            const { error: messagesError } = await supabase
              .from("messages")
              .delete()
              .eq("sender_id", user.id);

            if (messagesError) {
              details.push(`Warning: Error deleting messages for ${user.nickname}: ${messagesError.message}`);
            } else {
              details.push(`✓ Deleted messages for ${user.nickname}`);
            }
          } catch (error) {
            details.push(`Warning: Messages table access failed for ${user.nickname}: ${error.message}`);
          }

          // 2. Delete conversations (with corrected syntax and error handling)
          try {
            const { error: conversationsError } = await supabase
              .from("conversations")
              .delete()
              .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

            if (conversationsError) {
              details.push(`Warning: Error deleting conversations for ${user.nickname}: ${conversationsError.message}`);
            } else {
              details.push(`✓ Deleted conversations for ${user.nickname}`);
            }
          } catch (error) {
            details.push(`Warning: Conversations table access failed for ${user.nickname}: ${error.message}`);
          }

          // 3. Delete blocks (with error handling)
          try {
            const { error: blocksError } = await supabase
              .from("blocks")
              .delete()
              .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

            if (blocksError) {
              details.push(`Warning: Error deleting blocks for ${user.nickname}: ${blocksError.message}`);
            } else {
              details.push(`✓ Deleted blocks for ${user.nickname}`);
            }
          } catch (error) {
            details.push(`Warning: Blocks table access failed for ${user.nickname}: ${error.message}`);
          }

          // 4. Delete reports (with corrected syntax and error handling)
          try {
            const { error: reportsError } = await supabase
              .from("reports")
              .delete()
              .or(`reporter_id.eq.${user.id},reported_user_id.eq.${user.id}`);

            if (reportsError) {
              details.push(`Warning: Error deleting reports for ${user.nickname}: ${reportsError.message}`);
            } else {
              details.push(`✓ Deleted reports for ${user.nickname}`);
            }
          } catch (error) {
            details.push(`Warning: Reports table access failed for ${user.nickname}: ${error.message}`);
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
   * Find ghost users - users marked online but with no presence records
   */
  async findGhostUsers(): Promise<{
    ghostUsers: any[];
    ghostCount: number;
    details: string[];
  }> {
    const details: string[] = [];
    
    try {
      details.push("🔍 Analyzing ghost users (marked online but no presence)...");

      // Get all online users
      const { data: onlineUsers, error: usersError } = await supabase
        .from("users")
        .select("*")
        .eq("online", true);

      if (usersError) throw usersError;

      // Get all presence records  
      const { data: presenceRecords, error: presenceError } = await supabase
        .from("presence")
        .select("user_id");

      if (presenceError) throw presenceError;

      const presenceUserIds = new Set(presenceRecords?.map(p => p.user_id) || []);
      
      // Find users marked online but not in presence
      const ghostUsers = (onlineUsers || []).filter(user => !presenceUserIds.has(user.id));

      details.push(`📊 Found ${onlineUsers?.length || 0} users marked online`);
      details.push(`📊 Found ${presenceRecords?.length || 0} presence records`);
      details.push(`👻 Found ${ghostUsers.length} ghost users`);

      if (ghostUsers.length > 0) {
        details.push("👻 Ghost users breakdown:");
        const standardGhosts = ghostUsers.filter(u => u.role === 'standard').length;
        const vipGhosts = ghostUsers.filter(u => u.role === 'vip').length;
        const adminGhosts = ghostUsers.filter(u => u.role === 'admin').length;
        
        details.push(`  - Standard: ${standardGhosts}`);
        details.push(`  - VIP: ${vipGhosts}`);
        details.push(`  - Admin: ${adminGhosts}`);
      }

      return {
        ghostUsers,
        ghostCount: ghostUsers.length,
        details
      };

    } catch (error) {
      details.push(`❌ Error finding ghost users: ${error.message || 'Unknown error'}`);
      return {
        ghostUsers: [],
        ghostCount: 0,
        details
      };
    }
  }

  /**
   * Fix ghost users - set offline users without presence records to offline
   */
  async fixGhostUsers(): Promise<{
    success: boolean;
    message: string;
    fixedCount: number;
    details: string[];
  }> {
    const details: string[] = [];
    let fixedCount = 0;

    try {
      details.push("🔧 Starting ghost user fix...");

      // Find ghost users first
      const ghostAnalysis = await this.findGhostUsers();
      details.push(...ghostAnalysis.details);

      if (ghostAnalysis.ghostCount === 0) {
        return {
          success: true,
          message: "No ghost users found - database is clean",
          fixedCount: 0,
          details
        };
      }

      // Fix standard ghost users (set offline)
      const standardGhosts = ghostAnalysis.ghostUsers.filter(u => u.role === 'standard');
      if (standardGhosts.length > 0) {
        details.push(`🔧 Setting ${standardGhosts.length} standard ghost users offline...`);
        
        const { error: standardError } = await supabase
          .from("users")
          .update({ 
            online: false,
            last_seen: new Date().toISOString()
          })
          .in("id", standardGhosts.map(u => u.id));

        if (standardError) {
          details.push(`❌ Error fixing standard ghosts: ${standardError.message}`);
        } else {
          details.push(`✅ Fixed ${standardGhosts.length} standard ghost users`);
          fixedCount += standardGhosts.length;
        }
      }

      // Fix VIP/Admin ghost users (set offline but preserve)
      const premiumGhosts = ghostAnalysis.ghostUsers.filter(u => u.role === 'vip' || u.role === 'admin');
      if (premiumGhosts.length > 0) {
        details.push(`🔧 Setting ${premiumGhosts.length} VIP/Admin ghost users offline...`);
        
        const { error: premiumError } = await supabase
          .from("users")
          .update({ 
            online: false,
            last_seen: new Date().toISOString()
          })
          .in("id", premiumGhosts.map(u => u.id));

        if (premiumError) {
          details.push(`❌ Error fixing premium ghosts: ${premiumError.message}`);
        } else {
          details.push(`✅ Fixed ${premiumGhosts.length} VIP/Admin ghost users (preserved accounts)`);
          fixedCount += premiumGhosts.length;
        }
      }

      return {
        success: true,
        message: `Fixed ${fixedCount} ghost users`,
        fixedCount,
        details
      };

    } catch (error) {
      details.push(`❌ Fatal error fixing ghost users: ${error.message || 'Unknown error'}`);
      return {
        success: false,
        message: `Ghost fix failed: ${error.message || 'Unknown error'}`,
        fixedCount,
        details
      };
    }
  }

  /**
   * Clean up ghost users completely (delete offline standard users without presence)
   */
  async cleanupGhostUsers(): Promise<{
    success: boolean;
    message: string;
    deletedCount: number;
    details: string[];
  }> {
    const details: string[] = [];
    let deletedCount = 0;

    try {
      details.push("🗑️ Starting ghost user cleanup...");

      // Find ghost users
      const ghostAnalysis = await this.findGhostUsers();
      details.push(...ghostAnalysis.details);

      // Only delete standard ghost users that are offline
      const standardGhosts = ghostAnalysis.ghostUsers.filter(u => u.role === 'standard');
      
      if (standardGhosts.length === 0) {
        return {
          success: true,
          message: "No standard ghost users found to cleanup",
          deletedCount: 0,
          details
        };
      }

      details.push(`🗑️ Deleting ${standardGhosts.length} standard ghost users...`);

      // Delete each ghost user completely
      for (const ghost of standardGhosts) {
        try {
          details.push(`🗑️ Deleting ghost user: ${ghost.nickname} (${ghost.id.substring(0, 8)}...)`);

          // Delete user's data with individual error handling
          const cleanupTasks = [
            { name: 'messages', table: 'messages', condition: 'sender_id' },
            { name: 'conversations', table: 'conversations', condition: 'or', value: `user1_id.eq.${ghost.id},user2_id.eq.${ghost.id}` },
            { name: 'blocks', table: 'blocks', condition: 'or', value: `blocker_id.eq.${ghost.id},blocked_id.eq.${ghost.id}` },
            { name: 'reports', table: 'reports', condition: 'or', value: `reporter_id.eq.${ghost.id},reported_user_id.eq.${ghost.id}` }
          ];

          for (const task of cleanupTasks) {
            try {
              let query = supabase.from(task.table).delete();
              
              if (task.condition === 'or') {
                query = query.or(task.value);
              } else {
                query = query.eq(task.condition, ghost.id);
              }
              
              const { error } = await query;
              
              if (error) {
                details.push(`Warning: Error deleting ${task.name} for ${ghost.nickname}: ${error.message}`);
              } else {
                details.push(`✓ Deleted ${task.name} for ${ghost.nickname}`);
              }
            } catch (error) {
              details.push(`Warning: ${task.table} table access failed for ${ghost.nickname}: ${error.message}`);
            }
          }

          // Delete the user
          const { error: userError } = await supabase
            .from("users")
            .delete()
            .eq("id", ghost.id);

          if (userError) {
            details.push(`❌ Error deleting ghost ${ghost.nickname}: ${userError.message}`);
          } else {
            details.push(`✅ Deleted ghost user ${ghost.nickname}`);
            deletedCount++;
          }

        } catch (userError) {
          details.push(`❌ Error processing ghost ${ghost.nickname}: ${userError.message || 'Unknown error'}`);
        }
      }

      return {
        success: true,
        message: `Ghost cleanup completed: ${deletedCount}/${standardGhosts.length} ghost users deleted`,
        deletedCount,
        details
      };

    } catch (error) {
      details.push(`❌ Fatal error during ghost cleanup: ${error.message || 'Unknown error'}`);
      return {
        success: false,
        message: `Ghost cleanup failed: ${error.message || 'Unknown error'}`,
        deletedCount,
        details
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
   * Safe cleanup - only clean essential tables that we know exist
   */
  async safeCleanupOfflineUsers(): Promise<{
    success: boolean;
    message: string;
    deletedCount: number;
    details: string[];
  }> {
    const details: string[] = [];
    let deletedCount = 0;

    try {
      details.push("🛡️ Starting SAFE cleanup (essential tables only)...");

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

      details.push(`Found ${offlineStandardUsers.length} offline standard users for safe cleanup`);

      // Clean up each user (only essential operations)
      for (const user of offlineStandardUsers) {
        try {
          details.push(`🛡️ Safe cleanup for: ${user.nickname} (${user.id.substring(0, 8)}...)`);

          // Only clean presence and user record (skip potentially missing tables)
          const { error: presenceError } = await supabase
            .from("presence")
            .delete()
            .eq("user_id", user.id);

          if (presenceError) {
            details.push(`Warning: Error deleting presence for ${user.nickname}: ${presenceError.message}`);
          } else {
            details.push(`✓ Deleted presence for ${user.nickname}`);
          }

          // Delete the user record
          const { error: userError } = await supabase
            .from("users")
            .delete()
            .eq("id", user.id);

          if (userError) {
            details.push(`❌ Error deleting user ${user.nickname}: ${userError.message}`);
          } else {
            details.push(`✅ Successfully deleted user ${user.nickname} (safe mode)`);
            deletedCount++;
          }

        } catch (userError) {
          details.push(`❌ Error processing user ${user.nickname}: ${userError.message || 'Unknown error'}`);
        }
      }

      return {
        success: true,
        message: `Safe cleanup completed: ${deletedCount}/${offlineStandardUsers.length} users deleted`,
        deletedCount,
        details
      };

    } catch (error) {
      details.push(`❌ Fatal error during safe cleanup: ${error.message || 'Unknown error'}`);
      return {
        success: false,
        message: `Safe cleanup failed: ${error.message || 'Unknown error'}`,
        deletedCount,
        details
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