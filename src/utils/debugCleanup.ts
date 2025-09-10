import { supabase } from "../config/supabase";
import { manualCleanupService } from "../services/supabase/manualCleanupService";

/**
 * Debug cleanup utilities for console testing
 * You can call these from the browser console for immediate testing
 */

// Make cleanup functions available globally for debugging
declare global {
  interface Window {
    debugCleanup: {
      checkUsers: () => Promise<void>;
      checkPresence: () => Promise<void>;
      testCleanup: () => Promise<void>;
      cleanupOfflineUsers: () => Promise<void>;
      forceOffline: () => Promise<void>;
      clearPresence: () => Promise<void>;
      findGhosts: () => Promise<void>;
      fixGhosts: () => Promise<void>;
      cleanupGhosts: () => Promise<void>;
    };
  }
}

const debugCleanup = {
  /**
   * Check current users in database
   */
  async checkUsers() {
    console.log("🔍 Checking users in database...");
    const stats = await manualCleanupService.getAllUsers();
    console.table(stats);
    console.log("📊 User breakdown:", {
      total: stats.totalUsers,
      online: stats.onlineUsers,
      standard: stats.standardUsers,
      vip: stats.vipUsers,
      admin: stats.adminUsers
    });
    
    // Show actual users
    console.log("👥 All users:");
    console.table(stats.users.map(u => ({
      id: u.id.substring(0, 8) + "...",
      nickname: u.nickname,
      role: u.role,
      online: u.online,
      created: new Date(u.created_at).toLocaleTimeString()
    })));
  },

  /**
   * Check presence records
   */
  async checkPresence() {
    console.log("🔍 Checking presence records...");
    const presence = await manualCleanupService.getAllPresence();
    console.log(`📊 Found ${presence.length} presence records`);
    console.table(presence.map(p => ({
      user_id: p.user_id.substring(0, 8) + "...",
      nickname: p.nickname,
      online: p.online,
      last_seen: new Date(p.last_seen).toLocaleTimeString()
    })));
  },

  /**
   * Run safe cleanup test
   */
  async testCleanup() {
    console.log("🧪 Running cleanup test...");
    const logs = await manualCleanupService.testCleanup();
    logs.forEach(log => console.log(log));
  },

  /**
   * Actually clean up offline standard users
   */
  async cleanupOfflineUsers() {
    console.log("🗑️  Starting cleanup of offline standard users...");
    const result = await manualCleanupService.cleanupOfflineStandardUsers();
    
    console.log(`✅ Cleanup result: ${result.message}`);
    console.log(`📊 Deleted: ${result.deletedCount} users`);
    
    if (result.details.length > 0) {
      console.log("📝 Detailed logs:");
      result.details.forEach(detail => console.log(detail));
    }
  },

  /**
   * Force all standard users offline
   */
  async forceOffline() {
    console.log("⚡ Forcing all standard users offline...");
    const result = await manualCleanupService.forceAllStandardUsersOffline();
    console.log(`✅ Result: ${result.message}`);
    console.log(`📊 Affected: ${result.affectedCount} users`);
  },

  /**
   * Clear all presence records (nuclear option)
   */
  async clearPresence() {
    console.log("💥 Clearing all presence records...");
    const result = await manualCleanupService.clearAllPresence();
    console.log(`✅ Result: ${result.message}`);
    console.log(`📊 Deleted: ${result.deletedCount} records`);
  },

  /**
   * Find ghost users (marked online but no presence)
   */
  async findGhosts() {
    console.log("👻 Finding ghost users...");
    const result = await manualCleanupService.findGhostUsers();
    console.log(`📊 Found ${result.ghostCount} ghost users`);
    result.details.forEach(detail => console.log(detail));
    
    if (result.ghostUsers.length > 0) {
      console.log("👻 Ghost users details:");
      console.table(result.ghostUsers.map(u => ({
        id: u.id.substring(0, 8) + "...",
        nickname: u.nickname,
        role: u.role,
        online: u.online,
        created: new Date(u.created_at).toLocaleTimeString()
      })));
    }
  },

  /**
   * Fix ghost users (set them offline)
   */
  async fixGhosts() {
    console.log("🔧 Fixing ghost users...");
    const result = await manualCleanupService.fixGhostUsers();
    console.log(`✅ Result: ${result.message}`);
    console.log(`📊 Fixed: ${result.fixedCount} users`);
    result.details.forEach(detail => console.log(detail));
  },

  /**
   * Clean up ghost users completely (delete standard ghosts)
   */
  async cleanupGhosts() {
    console.log("🗑️ Cleaning up ghost users...");
    const result = await manualCleanupService.cleanupGhostUsers();
    console.log(`✅ Result: ${result.message}`);
    console.log(`📊 Deleted: ${result.deletedCount} users`);
    result.details.forEach(detail => console.log(detail));
  }
};

// Make it globally available
if (typeof window !== 'undefined') {
  window.debugCleanup = debugCleanup;
  console.log("🚀 Debug cleanup utilities loaded! Available commands:");
  console.log("- window.debugCleanup.checkUsers() - Check current users");
  console.log("- window.debugCleanup.checkPresence() - Check presence records");
  console.log("- window.debugCleanup.testCleanup() - Run safe test");
  console.log("- window.debugCleanup.cleanupOfflineUsers() - Clean offline users");
  console.log("- window.debugCleanup.forceOffline() - Force users offline");
  console.log("- window.debugCleanup.clearPresence() - Clear all presence");
  console.log("👻 GHOST USER COMMANDS:");
  console.log("- window.debugCleanup.findGhosts() - Find ghost users (marked online but no presence)");
  console.log("- window.debugCleanup.fixGhosts() - Fix ghost users (set offline)");
  console.log("- window.debugCleanup.cleanupGhosts() - Delete ghost users completely");
}

export default debugCleanup;