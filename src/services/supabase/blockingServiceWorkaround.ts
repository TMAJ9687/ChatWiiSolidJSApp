import { supabase } from "../../config/supabase";
import type { Database } from "../../types/database.types";

type SupabaseBlock = Database['public']['Tables']['blocks']['Row'];
type SupabaseBlockInsert = Database['public']['Tables']['blocks']['Insert'];

interface BlockedUser {
  id: string;
  nickname: string;
  blockedAt: string;
  reason?: string;
}

class BlockingServiceWorkaround {
  private blockedUsersCache = new Set<string>();
  private usersWhoBlockedMeCache = new Set<string>();
  private cacheExpiry = 0;
  private readonly CACHE_DURATION = 5000; // 5 seconds

  /**
   * Block a user - uses direct SQL execution to bypass API issues
   */
  async blockUser(blockedUserId: string, reason?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    if (user.id === blockedUserId) {
      throw new Error('Cannot block yourself');
    }

    try {
      // Try using RPC function instead of direct table access
      const { error } = await supabase.rpc('create_block', {
        blocker_user_id: user.id,
        blocked_user_id: blockedUserId,
        block_reason: reason || null
      });

      if (error) {
        // Fallback to direct insert if RPC doesn't exist
        const blockData: SupabaseBlockInsert = {
          blocker_id: user.id,
          blocked_id: blockedUserId,
          reason: reason || null
        };

        const { error: insertError } = await supabase
          .from('blocks')
          .insert([blockData]);

        if (insertError && insertError.code !== '23505') { // Not a duplicate error
          throw insertError;
        }
      }

      // Update local cache immediately for instant UI update
      this.blockedUsersCache.add(blockedUserId);
      this.invalidateCache();
      
    } catch (error) {
      console.error('Error blocking user:', error);
      throw error;
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockedUserId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Try RPC first
      const { error } = await supabase.rpc('remove_block', {
        blocker_user_id: user.id,
        blocked_user_id: blockedUserId
      });

      if (error) {
        // Fallback to direct delete
        const { error: deleteError } = await supabase
          .from('blocks')
          .delete()
          .eq('blocker_id', user.id)
          .eq('blocked_id', blockedUserId);

        if (deleteError) {
          throw deleteError;
        }
      }

      // Update local cache immediately for instant UI update
      this.blockedUsersCache.delete(blockedUserId);
      this.invalidateCache();

    } catch (error) {
      console.error('Error unblocking user:', error);
      throw error;
    }
  }

  /**
   * Check if a user is blocked - uses cache to avoid 406 errors
   */
  async isUserBlocked(currentUserId: string, targetUserId: string): Promise<boolean> {
    // Can't block yourself - early return
    if (currentUserId === targetUserId) {
      return false;
    }

    // Try to refresh cache if expired
    if (Date.now() > this.cacheExpiry) {
      await this.refreshBlockedUsersCache(currentUserId);
    }

    return this.blockedUsersCache.has(targetUserId);
  }

  /**
   * Check if current user is blocked by another user
   */
  async isBlockedBy(blockerUserId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Try to refresh cache if expired
    if (Date.now() > this.cacheExpiry) {
      await this.refreshUsersWhoBlockedMeCache();
    }

    return this.usersWhoBlockedMeCache.has(blockerUserId);
  }

  /**
   * Get list of blocked users - returns cached data to avoid API issues
   */
  async getBlockedUsers(): Promise<BlockedUser[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Try to refresh cache if expired
    if (Date.now() > this.cacheExpiry) {
      await this.refreshBlockedUsersCache(user.id);
    }

    // Return simplified blocked user list from cache
    return Array.from(this.blockedUsersCache).map(userId => ({
      id: userId,
      nickname: `User ${userId.substring(0, 8)}`,
      blockedAt: new Date().toISOString(),
      reason: undefined
    }));
  }

  /**
   * Get users who blocked the current user
   */
  async getUsersWhoBlockedMe(): Promise<string[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Try to refresh cache if expired
    if (Date.now() > this.cacheExpiry) {
      await this.refreshUsersWhoBlockedMeCache();
    }

    return Array.from(this.usersWhoBlockedMeCache);
  }

  /**
   * Refresh the blocked users cache - fallback to empty on error
   */
  private async refreshBlockedUsersCache(userId: string): Promise<void> {
    try {
      // Try to get blocked users, but don't fail if it doesn't work
      const { data } = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', userId);

      if (data) {
        this.blockedUsersCache.clear();
        data.forEach(block => this.blockedUsersCache.add(block.blocked_id));
      }
    } catch (error) {
      console.warn('Could not refresh blocked users cache, using existing cache');
    }

    this.cacheExpiry = Date.now() + this.CACHE_DURATION;
  }

  /**
   * Refresh the users who blocked me cache
   */
  private async refreshUsersWhoBlockedMeCache(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data } = await supabase
        .from('blocks')
        .select('blocker_id')
        .eq('blocked_id', user.id);

      if (data) {
        this.usersWhoBlockedMeCache.clear();
        data.forEach(block => this.usersWhoBlockedMeCache.add(block.blocker_id));
      }
    } catch (error) {
      console.warn('Could not refresh users who blocked me cache, using existing cache');
    }
  }

  /**
   * Invalidate cache to force refresh
   */
  private invalidateCache(): void {
    this.cacheExpiry = 0;
  }

  /**
   * Force refresh all caches
   */
  async forceRefresh(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    this.invalidateCache();
    await Promise.all([
      this.refreshBlockedUsersCache(user.id),
      this.refreshUsersWhoBlockedMeCache()
    ]);
  }
}

export const blockingServiceWorkaround = new BlockingServiceWorkaround();
export type { BlockedUser };