import { cleanupService } from './cleanupService';
import { createServiceLogger } from '../../utils/logger';

const logger = createServiceLogger('DailyCleanupTrigger');

/**
 * Daily Cleanup Trigger Service
 * Handles automatic cleanup of anonymous users offline 1+ hours
 */
class DailyCleanupTrigger {
  private isRunning = false;
  private lastRun: Date | null = null;

  /**
   * Check if cleanup should run and execute if needed
   * Safe to call multiple times - includes throttling
   */
  async checkAndRunCleanup(): Promise<{
    executed: boolean;
    message: string;
    usersDeleted?: number;
  }> {
    if (this.isRunning) {
      return {
        executed: false,
        message: 'Cleanup already running'
      };
    }

    try {
      this.isRunning = true;
      logger.debug('Checking if daily cleanup should run...');

      const result = await cleanupService.runDailyCleanup();

      this.lastRun = new Date();

      if (result.success) {
        logger.debug('Daily cleanup completed:', result.message);
        return {
          executed: true,
          message: result.message,
          usersDeleted: result.result.count
        };
      } else {
        logger.error('Daily cleanup failed:', result.message);
        return {
          executed: false,
          message: result.message
        };
      }
    } catch (error) {
      logger.error('Error in cleanup trigger:', error);
      return {
        executed: false,
        message: `Cleanup trigger error: ${error.message || 'Unknown error'}`
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start periodic cleanup checking (every hour)
   * Only runs cleanup once per day automatically
   */
  startPeriodicCleanup(): void {
    // Check every hour if cleanup is needed
    const intervalId = setInterval(async () => {
      try {
        await this.checkAndRunCleanup();
      } catch (error) {
        logger.error('Error in periodic cleanup check:', error);
      }
    }, 60 * 60 * 1000); // Every hour

    logger.debug('Started periodic cleanup checking (every hour)');

    // Cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        clearInterval(intervalId);
      });
    }
  }

  /**
   * Force run cleanup now (admin override)
   */
  async forceRunCleanup(): Promise<{
    success: boolean;
    message: string;
    usersDeleted: number;
  }> {
    try {
      const result = await cleanupService.manualCleanup();
      return {
        success: result.success,
        message: result.error || result.result.details,
        usersDeleted: result.result.count
      };
    } catch (error) {
      logger.error('Error in force cleanup:', error);
      return {
        success: false,
        message: `Force cleanup failed: ${error.message || 'Unknown error'}`,
        usersDeleted: 0
      };
    }
  }

  /**
   * Get cleanup status
   */
  getStatus(): {
    isRunning: boolean;
    lastRun: Date | null;
  } {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun
    };
  }
}

export const dailyCleanupTrigger = new DailyCleanupTrigger();

// Auto-start in production/development
if (typeof window !== 'undefined') {
  // Start periodic checking when the app loads
  setTimeout(() => {
    dailyCleanupTrigger.startPeriodicCleanup();
    logger.debug('Daily cleanup trigger initialized');
  }, 5000); // Wait 5 seconds after app load
}