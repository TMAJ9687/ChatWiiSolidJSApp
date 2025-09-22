import { supabase } from "../../config/supabase";
import type { Database } from "../../types/database.types";
import { createServiceLogger } from "../../utils/logger";

const logger = createServiceLogger('PhotoTrackingService');

type SupabasePhotoUsage = Database['public']['Tables']['photo_usage']['Row'];
type SupabasePhotoUsageInsert = Database['public']['Tables']['photo_usage']['Insert'];

interface PhotoUsageStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  total: number;
}

class PhotoTrackingService {
  private readonly DAILY_LIMIT = 20; // Maximum photos per day
  private readonly VIP_DAILY_LIMIT = 100; // VIP user limit

  /**
   * Record that a photo was sent (increment usage)
   */
  async recordPhotoSent(userId?: string): Promise<void> {
    // Get current user if not provided
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      userId = user.id;
    }
    
    await this.trackPhotoUsage(userId);
  }

  /**
   * Track photo usage for a user
   */
  async trackPhotoUsage(userId: string): Promise<void> {
    try {
      // Validate userId
      if (!userId || !userId.trim()) {
        logger.warn('Invalid userId for photo usage tracking');
        return;
      }

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      // Try to increment existing record - gracefully handle table not existing
      const { data: existingUsage, error: fetchError } = await supabase
        .from('photo_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      // Handle various error types gracefully
      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No existing record found - continue to create new one
        } else if (fetchError.code === 'PGRST301' || fetchError.message?.includes('relation "public.photo_usage" does not exist')) {
          // Table doesn't exist - silently skip photo tracking
          logger.warn('Photo usage table not available - skipping tracking');
          return;
        } else if (fetchError.message?.includes('406') || fetchError.message?.includes('Not Acceptable')) {
          // 406 errors - likely RLS policy issues - silently skip tracking
          return;
        } else {
          logger.error('Photo usage fetch error:', fetchError);
          return; // Don't throw, just return to prevent 406 errors
        }
      }

      if (existingUsage) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('photo_usage')
          .update({
            count: existingUsage.count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUsage.id);

        if (updateError) {
          logger.error('Photo usage update error:', updateError);
          return; // Don't throw to prevent 406 errors
        }
      } else {
        // Create new record
        const usageData: SupabasePhotoUsageInsert = {
          user_id: userId,
          date: today,
          count: 1
        };

        const { error: insertError } = await supabase
          .from('photo_usage')
          .insert([usageData]);

        if (insertError) {
          logger.error('Photo usage insert error:', insertError);
          return; // Don't throw to prevent 406 errors
        }
      }
    } catch (error) {
      logger.error('Error tracking photo usage:', error);
      // Don't re-throw to prevent 406 errors from bubbling up
    }
  }

  /**
   * Check if user has reached daily photo limit
   */
  async hasReachedDailyLimit(userId: string, userRole: string = 'standard'): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const limit = userRole === 'vip' || userRole === 'admin' ? this.VIP_DAILY_LIMIT : this.DAILY_LIMIT;

      const { data, error } = await supabase
        .from('photo_usage')
        .select('count')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No existing record found - user hasn't used photos today
          return { canUpload: true, remaining: limit };
        } else if (error.message?.includes('406') || error.message?.includes('Not Acceptable') || error.code === 'PGRST301') {
          // RLS policy issues or table doesn't exist - allow upload but don't track
          // Silently handle RLS errors to avoid console spam
          return { canUpload: true, remaining: limit };
        } else {
          // Other errors - log but don't block upload
          logger.error('Photo usage check error:', error);
          return { canUpload: true, remaining: limit };
        }
      }

      const currentCount = data?.count || 0;
      const remaining = Math.max(0, limit - currentCount);
      return {
        canUpload: currentCount < limit,
        remaining: remaining
      };
    } catch (error) {
      logger.error('Error checking daily limit:', error);
      return { canUpload: true, remaining: this.DAILY_LIMIT }; // Allow usage if we can't check
    }
  }

  /**
   * Check if user can send a photo (with limit info)
   */
  async canSendPhoto(userId: string, userRole: string = 'standard'): Promise<{ canSend: boolean; limit?: number; remaining?: number; message?: string }> {
    try {
      const limit = userRole === 'vip' || userRole === 'admin' ? this.VIP_DAILY_LIMIT : this.DAILY_LIMIT;
      const currentUsage = await this.getTodayUsage(userId);
      const remaining = limit - currentUsage;

      if (remaining <= 0) {
        return {
          canSend: false,
          limit,
          remaining: 0,
          message: `Daily photo limit reached (${limit}). Limit resets at midnight.`
        };
      }

      return {
        canSend: true,
        limit,
        remaining
      };
    } catch (error) {
      logger.error('Error checking if can send photo:', error);
      return { canSend: true }; // Allow on error
    }
  }

  /**
   * Get user's photo usage for today
   */
  async getTodayUsage(userId: string): Promise<number> {
    try {
      // Validate userId
      if (!userId || !userId.trim()) {
        logger.warn('Invalid userId for photo usage check');
        return 0;
      }

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('photo_usage')
        .select('count')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      // Handle all possible error types gracefully
      if (error) {
        if (error.code === 'PGRST116') {
          // No record found - user hasn't sent photos today
          return 0;
        } else if (error.code === 'PGRST301' || error.message?.includes('relation "public.photo_usage" does not exist')) {
          // Table doesn't exist
          logger.warn('Photo usage table not available');
          return 0;
        } else if (error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
          // 406 errors - RLS policy issues
          logger.warn('Photo usage access denied');
          return 0;
        } else {
          logger.error('Photo usage query error:', error);
          return 0;
        }
      }

      return data?.count || 0;
    } catch (error) {
      logger.error('Error getting today usage:', error);
      return 0;
    }
  }

  /**
   * Get user's remaining photo allowance for today
   */
  async getRemainingAllowance(userId: string, userRole: string = 'standard'): Promise<number> {
    try {
      const todayUsage = await this.getTodayUsage(userId);
      const limit = userRole === 'vip' || userRole === 'admin' ? this.VIP_DAILY_LIMIT : this.DAILY_LIMIT;
      
      return Math.max(0, limit - todayUsage);
    } catch (error) {
      logger.error('Error getting remaining allowance:', error);
      return 0;
    }
  }

  /**
   * Get comprehensive photo usage statistics for a user
   */
  async getPhotoUsageStats(userId: string): Promise<PhotoUsageStats> {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Calculate date ranges
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];
      
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const monthAgoStr = monthAgo.toISOString().split('T')[0];

      // Get today's usage
      const { data: todayData, error: todayError } = await supabase
        .from('photo_usage')
        .select('count')
        .eq('user_id', userId)
        .eq('date', todayStr)
        .single();

      if (todayError && todayError.code !== 'PGRST116') {
        throw todayError;
      }

      // Get week's usage
      const { data: weekData, error: weekError } = await supabase
        .from('photo_usage')
        .select('count')
        .eq('user_id', userId)
        .gte('date', weekAgoStr)
        .lte('date', todayStr);

      if (weekError) {
        throw weekError;
      }

      // Get month's usage
      const { data: monthData, error: monthError } = await supabase
        .from('photo_usage')
        .select('count')
        .eq('user_id', userId)
        .gte('date', monthAgoStr)
        .lte('date', todayStr);

      if (monthError) {
        throw monthError;
      }

      // Get total usage
      const { data: totalData, error: totalError } = await supabase
        .from('photo_usage')
        .select('count')
        .eq('user_id', userId);

      if (totalError) {
        throw totalError;
      }

      return {
        today: todayData?.count || 0,
        thisWeek: (weekData || []).reduce((sum, usage) => sum + usage.count, 0),
        thisMonth: (monthData || []).reduce((sum, usage) => sum + usage.count, 0),
        total: (totalData || []).reduce((sum, usage) => sum + usage.count, 0)
      };
    } catch (error) {
      logger.error('Error getting photo usage stats:', error);
      return {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        total: 0
      };
    }
  }

  /**
   * Reset user's daily usage (admin function)
   */
  async resetDailyUsage(userId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase
        .from('photo_usage')
        .update({
          count: 0,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('date', today);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Error resetting daily usage:', error);
      throw error;
    }
  }

  /**
   * Get system-wide photo usage statistics (admin function)
   */
  async getSystemPhotoStats(): Promise<{
    totalPhotosToday: number;
    totalPhotosThisWeek: number;
    totalPhotosAllTime: number;
    activeUsersToday: number;
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      // Today's stats
      const { data: todayData, error: todayError } = await supabase
        .from('photo_usage')
        .select('count, user_id')
        .eq('date', today);

      if (todayError) {
        throw todayError;
      }

      // Week's stats
      const { data: weekData, error: weekError } = await supabase
        .from('photo_usage')
        .select('count')
        .gte('date', weekAgoStr)
        .lte('date', today);

      if (weekError) {
        throw weekError;
      }

      // All-time stats
      const { data: totalData, error: totalError } = await supabase
        .from('photo_usage')
        .select('count');

      if (totalError) {
        throw totalError;
      }

      return {
        totalPhotosToday: (todayData || []).reduce((sum, usage) => sum + usage.count, 0),
        totalPhotosThisWeek: (weekData || []).reduce((sum, usage) => sum + usage.count, 0),
        totalPhotosAllTime: (totalData || []).reduce((sum, usage) => sum + usage.count, 0),
        activeUsersToday: (todayData || []).filter(usage => usage.count > 0).length
      };
    } catch (error) {
      logger.error('Error getting system photo stats:', error);
      return {
        totalPhotosToday: 0,
        totalPhotosThisWeek: 0,
        totalPhotosAllTime: 0,
        activeUsersToday: 0
      };
    }
  }

  /**
   * Clean up old photo usage records (keep last 90 days)
   */
  async cleanupOldRecords(): Promise<void> {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const cutoffDate = ninetyDaysAgo.toISOString().split('T')[0];

      const { error } = await supabase
        .from('photo_usage')
        .delete()
        .lt('date', cutoffDate);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Error cleaning up old records:', error);
    }
  }
}

export const photoTrackingService = new PhotoTrackingService();
export type { PhotoUsageStats };