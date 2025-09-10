import { supabase } from "../../config/supabase";

/**
 * Server-side cleanup service using SQL functions with elevated permissions
 * These functions run with SECURITY DEFINER to bypass RLS policies
 */
class ServerCleanupService {

  /**
   * Fix ghost users using server-side SQL function
   */
  async fixGhostUsers(): Promise<{
    success: boolean;
    message: string;
    ghostCount: number;
    fixedCount: number;
    timestamp: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('fix_ghost_users');

      if (error) {
        console.error('Error calling fix_ghost_users function:', error);
        return {
          success: false,
          message: `Database function error: ${error.message}`,
          ghostCount: 0,
          fixedCount: 0,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: data.success,
        message: data.message,
        ghostCount: data.ghost_count,
        fixedCount: data.fixed_count,
        timestamp: data.timestamp
      };

    } catch (error) {
      console.error('Error in fixGhostUsers:', error);
      return {
        success: false,
        message: `Client error: ${error.message || 'Unknown error'}`,
        ghostCount: 0,
        fixedCount: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get comprehensive user statistics using server-side function
   */
  async getUserStats(): Promise<{
    totalUsers: number;
    onlineUsers: number;
    standardUsers: number;
    standardOnline: number;
    vipUsers: number;
    adminUsers: number;
    presenceRecords: number;
    ghostUsers: number;
    timestamp: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_user_stats');

      if (error) {
        console.error('Error calling get_user_stats function:', error);
        throw new Error(`Database function error: ${error.message}`);
      }

      return {
        totalUsers: data.total_users,
        onlineUsers: data.online_users,
        standardUsers: data.standard_users,
        standardOnline: data.standard_online,
        vipUsers: data.vip_users,
        adminUsers: data.admin_users,
        presenceRecords: data.presence_records,
        ghostUsers: data.ghost_users,
        timestamp: data.timestamp
      };

    } catch (error) {
      console.error('Error in getUserStats:', error);
      throw error;
    }
  }

  /**
   * Cleanup offline standard users using server-side function
   */
  async cleanupOfflineStandardUsers(): Promise<{
    success: boolean;
    message: string;
    deletedCount: number;
    timestamp: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('cleanup_offline_standard_users');

      if (error) {
        console.error('Error calling cleanup_offline_standard_users function:', error);
        return {
          success: false,
          message: `Database function error: ${error.message}`,
          deletedCount: 0,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: data.success,
        message: data.message,
        deletedCount: data.deleted_count,
        timestamp: data.timestamp
      };

    } catch (error) {
      console.error('Error in cleanupOfflineStandardUsers:', error);
      return {
        success: false,
        message: `Client error: ${error.message || 'Unknown error'}`,
        deletedCount: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check if server-side functions are available
   */
  async checkFunctionsAvailable(): Promise<boolean> {
    try {
      await supabase.rpc('get_user_stats');
      return true;
    } catch (error) {
      console.error('Server functions not available:', error);
      return false;
    }
  }
}

export const serverCleanupService = new ServerCleanupService();