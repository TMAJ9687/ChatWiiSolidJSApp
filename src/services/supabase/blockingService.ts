import { supabase } from "../../config/supabase";
import type { Database } from "../../types/database.types";
import { createServiceLogger } from "../../utils/logger";

const logger = createServiceLogger('BlockingService');

type SupabaseBlock = Database['public']['Tables']['blocks']['Row'];
type SupabaseBlockInsert = Database['public']['Tables']['blocks']['Insert'];

interface BlockedUser {
  id: string;
  nickname: string;
  blockedAt: string;
  reason?: string;
}

class BlockingService {
  /**
   * Block a user
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
      const blockData: SupabaseBlockInsert = {
        blocker_id: user.id,
        blocked_id: blockedUserId,
        reason: reason || null
      };

      const { error } = await supabase
        .from('blocks')
        .insert([blockData]);

      if (error) {
        // Check if it's a unique constraint error (already blocked)
        if (error.code === '23505') {
          throw new Error('User is already blocked');
        }
        throw error;
      }
    } catch (error) {
      logger.error('Error blocking user:', error);
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
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedUserId);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Error unblocking user:', error);
      throw error;
    }
  }

  /**
   * Check if a user is blocked by current user
   */
  async isUserBlocked(currentUserId: string, targetUserId: string): Promise<boolean> {
    // Can't block yourself - early return to prevent API calls
    if (currentUserId === targetUserId) {
      return false;
    }

    // Additional validation
    if (!currentUserId || !targetUserId || currentUserId.trim() === '' || targetUserId.trim() === '') {
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('blocks')
        .select('id')
        .eq('blocker_id', currentUserId)
        .eq('blocked_id', targetUserId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no record found

      // Handle specific error cases
      if (error) {
        // If it's a "not found" error, that's fine - user is not blocked
        if (error.code === 'PGRST116' || error.message?.includes('not found')) {
          return false;
        }
        
        // For 406 or policy errors, assume not blocked to prevent UI issues
        if (error.code === 'PGRST301' || error.message?.includes('406') || error.message?.includes('policy')) {
          logger.warn('RLS policy prevented blocking check, assuming not blocked:', { currentUserId: currentUserId.substring(0, 8), targetUserId: targetUserId.substring(0, 8) });
          return false;
        }
        
        logger.error('Blocking query error:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      logger.warn('Error checking if user is blocked, assuming not blocked:', error);
      return false;
    }
  }

  /**
   * Check if current user is blocked by another user
   */
  async isBlockedBy(blockerUserId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('blocks')
        .select('id')
        .eq('blocker_id', blockerUserId)
        .eq('blocked_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      logger.error('Error checking if blocked by user:', error);
      return false;
    }
  }

  /**
   * Get list of blocked users by current user
   */
  async getBlockedUsers(): Promise<BlockedUser[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('blocks')
        .select('id, blocked_id, created_at, reason')
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // For now, return simplified data without user nicknames 
      // We can enhance this later once the basic blocking works
      return (data || []).map((block: any) => ({
        id: block.blocked_id,
        nickname: `User ${block.blocked_id.substring(0, 8)}`, // Temporary nickname
        blockedAt: block.created_at,
        reason: block.reason
      }));
    } catch (error) {
      logger.error('Error getting blocked users:', error);
      return [];
    }
  }

  /**
   * Get users who blocked the current user
   */
  async getUsersWhoBlockedMe(): Promise<string[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('blocks')
        .select('blocker_id')
        .eq('blocked_id', user.id);

      if (error) {
        throw error;
      }

      return (data || []).map(block => block.blocker_id);
    } catch (error) {
      logger.error('Error getting users who blocked me:', error);
      return [];
    }
  }

  /**
   * Check if two users can communicate (neither has blocked the other)
   */
  async canCommunicate(userId1: string, userId2: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('blocks')
        .select('id')
        .or(`and(blocker_id.eq.${userId1},blocked_id.eq.${userId2}),and(blocker_id.eq.${userId2},blocked_id.eq.${userId1})`);

      if (error) {
        throw error;
      }

      // If no blocks found, they can communicate
      return (data?.length || 0) === 0;
    } catch (error) {
      logger.error('Error checking communication status:', error);
      return false; // Be safe and assume they can't communicate on error
    }
  }

  /**
   * Filter out blocked users from a user list
   */
  async filterBlockedUsers(userIds: string[]): Promise<string[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || userIds.length === 0) return userIds;

    try {
      // Get all blocks involving current user (both directions)
      const { data, error } = await supabase
        .from('blocks')
        .select('blocker_id, blocked_id')
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) return userIds;

      // Create set of blocked user IDs
      const blockedUserIds = new Set<string>();
      data.forEach(block => {
        if (block.blocker_id === user.id) {
          blockedUserIds.add(block.blocked_id);
        } else if (block.blocked_id === user.id) {
          blockedUserIds.add(block.blocker_id);
        }
      });

      // Filter out blocked users
      return userIds.filter(id => !blockedUserIds.has(id));
    } catch (error) {
      logger.error('Error filtering blocked users:', error);
      return userIds; // Return original list on error
    }
  }

  /**
   * Get block statistics for admin
   */
  async getBlockStats(): Promise<{ totalBlocks: number; topBlockedUsers: Array<{ userId: string; nickname: string; blockCount: number }> }> {
    try {
      const { data: totalData, error: totalError } = await supabase
        .from('blocks')
        .select('*', { count: 'exact', head: true });

      if (totalError) throw totalError;

      const { data: topBlockedData, error: topError } = await supabase
        .from('blocks')
        .select(`
          blocked_id,
          users!blocks_blocked_id_fkey (
            nickname
          )
        `)
        .limit(10);

      if (topError) throw topError;

      // Count blocks per user
      const blockCounts = new Map<string, { nickname: string; count: number }>();
      (topBlockedData || []).forEach((block: any) => {
        const userId = block.blocked_id;
        const nickname = block.users?.nickname || 'Unknown';
        
        if (blockCounts.has(userId)) {
          blockCounts.get(userId)!.count++;
        } else {
          blockCounts.set(userId, { nickname, count: 1 });
        }
      });

      const topBlockedUsers = Array.from(blockCounts.entries())
        .map(([userId, data]) => ({
          userId,
          nickname: data.nickname,
          blockCount: data.count
        }))
        .sort((a, b) => b.blockCount - a.blockCount)
        .slice(0, 10);

      return {
        totalBlocks: totalData?.length || 0,
        topBlockedUsers
      };
    } catch (error) {
      logger.error('Error getting block stats:', error);
      return {
        totalBlocks: 0,
        topBlockedUsers: []
      };
    }
  }
}

export const blockingService = new BlockingService();
export type { BlockedUser };