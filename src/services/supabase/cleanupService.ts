import { supabase } from "../../config/supabase";
import { createServiceLogger } from "../../utils/logger";

const logger = createServiceLogger('CleanupService');

interface CleanupStats {
  totalAnonymousUsers: number;
  activeAnonymousUsers: number;
  inactiveFor1HPlus: number;
  readyForCleanup: number;
}

interface CleanupResult {
  action: string;
  count: number;
  details: string;
}

interface CleanupLog {
  id: string;
  operation: string;
  usersAffected: number;
  details: string;
  executedAt: string;
}

class CleanupService {
  /**
   * Get statistics about anonymous users
   */
  async getAnonymousUserStats(): Promise<CleanupStats> {
    try {
      const { data, error } = await supabase.rpc('get_anonymous_user_stats');
      
      if (error) {
        logger.error('Error getting anonymous user stats:', error);
        throw error;
      }

      const stats = data?.[0] || {};
      return {
        totalAnonymousUsers: parseInt(stats.total_anonymous_users) || 0,
        activeAnonymousUsers: parseInt(stats.active_anonymous_users) || 0,
        inactiveFor1HPlus: parseInt(stats.inactive_for_1h_plus) || 0,
        readyForCleanup: parseInt(stats.ready_for_cleanup) || 0
      };
    } catch (error) {
      logger.error('Error fetching cleanup stats:', error);
      return {
        totalAnonymousUsers: 0,
        activeAnonymousUsers: 0,
        inactiveFor1HPlus: 0,
        readyForCleanup: 0
      };
    }
  }

  /**
   * Run cleanup in dry-run mode (safe - shows what would be deleted)
   */
  async dryRunCleanup(): Promise<CleanupResult> {
    try {
      const { data, error } = await supabase.rpc('safe_cleanup_anonymous_users', { dry_run: true });
      
      if (error) {
        logger.error('Error running dry cleanup:', error);
        throw error;
      }

      const result = data?.[0] || {};
      return {
        action: result.action || 'DRY RUN',
        count: parseInt(result.count) || 0,
        details: result.details || 'No details available'
      };
    } catch (error) {
      logger.error('Error in dry run cleanup:', error);
      return {
        action: 'ERROR',
        count: 0,
        details: `Error: ${error.message || 'Unknown error occurred'}`
      };
    }
  }

  /**
   * Actually perform the cleanup (DESTRUCTIVE - deletes users)
   * Only admins should call this
   */
  async executeCleanup(): Promise<CleanupResult> {
    try {
      const { data, error } = await supabase.rpc('safe_cleanup_anonymous_users', { dry_run: false });
      
      if (error) {
        logger.error('Error executing cleanup:', error);
        throw error;
      }

      const result = data?.[0] || {};
      return {
        action: result.action || 'CLEANUP EXECUTED',
        count: parseInt(result.count) || 0,
        details: result.details || 'No details available'
      };
    } catch (error) {
      logger.error('Error executing cleanup:', error);
      throw error;
    }
  }

  /**
   * Run cleanup with logging (recommended for automated cleanup)
   */
  async executeCleanupWithLogging(): Promise<void> {
    try {
      const { error } = await supabase.rpc('cleanup_anonymous_users_with_logging');
      
      if (error) {
        logger.error('Error executing cleanup with logging:', error);
        throw error;
      }
    } catch (error) {
      logger.error('Error in cleanup with logging:', error);
      throw error;
    }
  }

  /**
   * Get cleanup operation logs (admin only)
   */
  async getCleanupLogs(limit = 50): Promise<CleanupLog[]> {
    try {
      const { data, error } = await supabase
        .from('cleanup_logs')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        logger.error('Error getting cleanup logs:', error);
        throw error;
      }

      return (data || []).map(log => ({
        id: log.id,
        operation: log.operation,
        usersAffected: log.users_affected || 0,
        details: log.details || '',
        executedAt: log.executed_at
      }));
    } catch (error) {
      logger.error('Error fetching cleanup logs:', error);
      return [];
    }
  }

  /**
   * Check if automatic cleanup is running (by checking recent logs)
   */
  async isAutomaticCleanupActive(): Promise<boolean> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('cleanup_logs')
        .select('id')
        .gte('executed_at', oneHourAgo)
        .limit(1);
      
      if (error) {
        logger.error('Error checking cleanup activity:', error);
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      logger.error('Error checking automatic cleanup:', error);
      return false;
    }
  }

  /**
   * Manual cleanup that can be called by admin interface
   * Returns both the result and updates logs
   */
  async manualCleanup(): Promise<{
    success: boolean;
    result: CleanupResult;
    error?: string;
  }> {
    try {
      // First do a dry run to get info
      const dryRun = await this.dryRunCleanup();
      
      if (dryRun.count === 0) {
        return {
          success: true,
          result: {
            action: 'NO ACTION NEEDED',
            count: 0,
            details: 'No inactive anonymous users found to cleanup'
          }
        };
      }

      // Execute the actual cleanup
      const result = await this.executeCleanup();
      
      // Log the manual operation
      await this.logManualOperation(result);
      
      return {
        success: true,
        result
      };
    } catch (error) {
      logger.error('Error in manual cleanup:', error);
      return {
        success: false,
        result: {
          action: 'ERROR',
          count: 0,
          details: `Error: ${error.message || 'Unknown error'}`
        },
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Log a manual cleanup operation
   */
  private async logManualOperation(result: CleanupResult): Promise<void> {
    try {
      await supabase.rpc('log_cleanup_operation', {
        op: 'MANUAL_CLEANUP',
        users_count: result.count,
        details_text: result.details
      });
    } catch (error) {
      logger.error('Error logging manual operation:', error);
    }
  }

  /**
   * Get a summary of cleanup activity for admin dashboard
   */
  async getCleanupSummary(): Promise<{
    stats: CleanupStats;
    recentActivity: CleanupLog[];
    lastCleanup: CleanupLog | null;
    isAutomaticActive: boolean;
  }> {
    try {
      const [stats, recentLogs, isActive] = await Promise.all([
        this.getAnonymousUserStats(),
        this.getCleanupLogs(10),
        this.isAutomaticCleanupActive()
      ]);

      return {
        stats,
        recentActivity: recentLogs,
        lastCleanup: recentLogs[0] || null,
        isAutomaticActive: isActive
      };
    } catch (error) {
      logger.error('Error getting cleanup summary:', error);
      return {
        stats: {
          totalAnonymousUsers: 0,
          activeAnonymousUsers: 0,
          inactiveFor1HPlus: 0,
          readyForCleanup: 0
        },
        recentActivity: [],
        lastCleanup: null,
        isAutomaticActive: false
      };
    }
  }

  /**
   * Run automatic daily cleanup
   * Safe to call multiple times - checks last run time
   */
  async runDailyCleanup(): Promise<{
    success: boolean;
    result: CleanupResult;
    message: string;
  }> {
    try {
      // Check if cleanup already ran today
      const today = new Date().toISOString().split('T')[0];
      const { data: recentRuns, error: checkError } = await supabase
        .from('cleanup_logs')
        .select('id')
        .gte('executed_at', today + 'T00:00:00.000Z')
        .eq('operation', 'automated_daily_cleanup')
        .limit(1);

      if (checkError) {
        throw checkError;
      }

      if (recentRuns && recentRuns.length > 0) {
        return {
          success: true,
          result: {
            action: 'ALREADY_RAN_TODAY',
            count: 0,
            details: 'Daily cleanup already completed today'
          },
          message: 'Daily cleanup already completed today'
        };
      }

      // Run the cleanup
      const result = await this.executeCleanup();

      // Log as automated operation
      await supabase.rpc('log_cleanup_operation', {
        op: 'automated_daily_cleanup',
        users_count: result.count,
        details_text: `Daily automated cleanup: ${result.details}`
      });

      return {
        success: true,
        result,
        message: `Daily cleanup completed: ${result.count} users removed`
      };
    } catch (error) {
      logger.error('Error in daily cleanup:', error);
      return {
        success: false,
        result: {
          action: 'ERROR',
          count: 0,
          details: `Error: ${error.message || 'Unknown error'}`
        },
        message: `Daily cleanup failed: ${error.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Enable automatic cleanup (sets up recurring job)
   * Note: Uses simplified function without pg_cron dependency
   */
  async enableAutomaticCleanup(): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.rpc('enable_cleanup_schedule');

      if (error) {
        throw error;
      }

      return {
        success: data?.success || true,
        message: data?.message || 'Automatic cleanup enabled.'
      };
    } catch (error) {
      logger.error('Error enabling automatic cleanup:', error);
      return {
        success: false,
        message: `Failed to enable automatic cleanup: ${error.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Disable automatic cleanup
   */
  async disableAutomaticCleanup(): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.rpc('disable_cleanup_schedule');

      if (error) {
        throw error;
      }

      return {
        success: data?.success || true,
        message: data?.message || 'Automatic cleanup disabled.'
      };
    } catch (error) {
      logger.error('Error disabling automatic cleanup:', error);
      return {
        success: false,
        message: `Failed to disable automatic cleanup: ${error.message || 'Unknown error'}`
      };
    }
  }
}

export const cleanupService = new CleanupService();
export type { CleanupStats, CleanupResult, CleanupLog };