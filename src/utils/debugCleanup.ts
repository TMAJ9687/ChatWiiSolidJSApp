import { supabase } from "../config/supabase";
import { manualCleanupService } from "../services/supabase/manualCleanupService";
import { serverCleanupService } from "../services/supabase/serverCleanupService";

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
      safeCleanup: () => Promise<void>;
      forceOffline: () => Promise<void>;
      clearPresence: () => Promise<void>;
      findGhosts: () => Promise<void>;
      fixGhosts: () => Promise<void>;
      cleanupGhosts: () => Promise<void>;
      // Server-side functions (with elevated permissions)
      serverFixGhosts: () => Promise<void>;
      serverStats: () => Promise<void>;
      serverCleanup: () => Promise<void>;
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
   * Safe cleanup - only essential tables
   */
  async safeCleanup() {
    console.log("🛡️ Starting SAFE cleanup of offline standard users...");
    const result = await manualCleanupService.safeCleanupOfflineUsers();
    
    console.log(`✅ Safe cleanup result: ${result.message}`);
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
  },

  /**
   * SERVER-SIDE: Fix ghost users using elevated permissions (RECOMMENDED)
   */
  async serverFixGhosts() {
    console.log("🛠️ SERVER: Fixing ghost users with elevated permissions...");
    const result = await serverCleanupService.fixGhostUsers();
    console.log(`✅ Server Result: ${result.message}`);
    console.log(`📊 Ghost Users: ${result.ghostCount}`);
    console.log(`📊 Fixed: ${result.fixedCount}`);
    console.log(`🕐 Timestamp: ${result.timestamp}`);
  },

  /**
   * SERVER-SIDE: Get comprehensive user stats with elevated permissions
   */
  async serverStats() {
    console.log("📊 SERVER: Getting comprehensive user statistics...");
    try {
      const stats = await serverCleanupService.getUserStats();
      console.log("📊 User Statistics:");
      console.table({
        'Total Users': stats.totalUsers,
        'Online Users': stats.onlineUsers,
        'Standard Users': stats.standardUsers,
        'Standard Online': stats.standardOnline,
        'VIP Users': stats.vipUsers,
        'Admin Users': stats.adminUsers,
        'Presence Records': stats.presenceRecords,
        'Ghost Users': stats.ghostUsers
      });
      console.log(`🕐 Server Timestamp: ${stats.timestamp}`);
    } catch (error) {
      console.error("❌ Server stats error:", error.message);
    }
  },

  /**
   * SERVER-SIDE: Cleanup offline standard users with elevated permissions
   */
  async serverCleanup() {
    console.log("🛠️ SERVER: Cleaning up offline standard users with elevated permissions...");
    const result = await serverCleanupService.cleanupOfflineStandardUsers();
    console.log(`✅ Server Result: ${result.message}`);
    console.log(`📊 Deleted: ${result.deletedCount} users`);
    console.log(`🕐 Timestamp: ${result.timestamp}`);
  }
};

// Make it globally available
if (typeof window !== 'undefined') {
  window.debugCleanup = debugCleanup;
  console.log("🚀 Debug cleanup utilities loaded! Available commands:");
  console.log("📊 STATISTICS:");
  console.log("- window.debugCleanup.checkUsers() - Check current users (client-side)");
  console.log("- window.debugCleanup.serverStats() - 🛠️ SERVER: Complete stats (RECOMMENDED)");
  console.log("- window.debugCleanup.checkPresence() - Check presence records");
  console.log("- window.debugCleanup.testCleanup() - Run safe test");
  console.log("");
  console.log("🗑️ CLEANUP COMMANDS:");
  console.log("- window.debugCleanup.serverCleanup() - 🛠️ SERVER: Clean offline users (RECOMMENDED)");
  console.log("- window.debugCleanup.safeCleanup() - 🛡️ Client: SAFE cleanup (essential tables only)");
  console.log("- window.debugCleanup.cleanupOfflineUsers() - Client: Clean offline users (full)");
  console.log("- window.debugCleanup.forceOffline() - Force users offline");
  console.log("- window.debugCleanup.clearPresence() - Clear all presence");
  console.log("");
  console.log("👻 GHOST USER COMMANDS:");
  console.log("- window.debugCleanup.findGhosts() - Find ghost users (client-side)");
  console.log("- window.debugCleanup.serverFixGhosts() - 🛠️ SERVER: Fix ghost users (RECOMMENDED!)");
  console.log("- window.debugCleanup.fixGhosts() - Client: Fix ghost users (may fail with RLS)");
  console.log("- window.debugCleanup.cleanupGhosts() - Delete ghost users completely");
  console.log("");
  console.log("🛠️ TIP: Use SERVER commands (serverStats, serverFixGhosts, serverCleanup) for reliable results!");
}

export default debugCleanup;