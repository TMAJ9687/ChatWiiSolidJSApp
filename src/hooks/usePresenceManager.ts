import { createSignal, onMount, onCleanup } from "solid-js";
import { presenceService, type PresenceUser } from "../services/supabase/presenceService";
import type { User } from "../types/user.types";
import { createServiceLogger } from "../utils/logger";

const logger = createServiceLogger('usePresenceManager');

export interface UsePresenceManagerOptions {
  currentUser: User | null;
  autoJoin?: boolean;
}

export function usePresenceManager(options: UsePresenceManagerOptions) {
  const { currentUser, autoJoin = true } = options;
  
  const [activeUsers, setActiveUsers] = createSignal<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = createSignal(false);
  const [stats, setStats] = createSignal({
    totalOnline: 0,
    totalUsers: 0,
    staleUsers: 0
  });

  let presenceSubscription: (() => void) | null = null;
  let statsInterval: number | null = null;

  // Convert PresenceUser to User format for compatibility
  const convertToUsers = (presenceUsers: PresenceUser[]): User[] => {
    return presenceUsers.map(pu => ({
      id: pu.user_id,
      nickname: pu.nickname,
      gender: pu.gender,
      age: pu.age,
      country: pu.country,
      role: pu.role,
      avatar: pu.avatar,
      online: pu.online,
      last_seen: pu.last_seen,
      created_at: pu.joined_at,
      status: 'active' as const,
      vipExpiresAt: null // Will be populated if needed
    }));
  };

  // Join presence system
  const joinPresence = async () => {
    if (!currentUser) return;

    try {
      await presenceService.joinPresence(currentUser.id);
      setIsConnected(true);
      logger.debug('Joined presence system');
      
      // Load initial active users
      await refreshActiveUsers();
    } catch (error) {
      logger.error('Error joining presence:', error);
      setIsConnected(false);
    }
  };

  // Leave presence system
  const leavePresence = async () => {
    try {
      await presenceService.leavePresence();
      setIsConnected(false);
      logger.debug('Left presence system');
    } catch (error) {
      logger.error('Error leaving presence:', error);
    }
  };

  // Refresh active users list
  const refreshActiveUsers = async () => {
    try {
      const users = await presenceService.getActiveUsers();
      setActiveUsers(users);
      logger.debug(`Loaded ${users.length} active users`);
    } catch (error) {
      logger.error('Error refreshing active users:', error);
    }
  };

  // Update presence statistics
  const updateStats = async () => {
    try {
      const newStats = await presenceService.getPresenceStats();
      setStats(newStats);
    } catch (error) {
      logger.error('Error updating stats:', error);
    }
  };

  // Trigger manual cleanup
  const triggerCleanup = async () => {
    try {
      const result = await presenceService.triggerCleanup();
      logger.debug(`Cleaned up ${result.cleaned} stale users`);
      await refreshActiveUsers();
      await updateStats();
      return result;
    } catch (error) {
      logger.error('Error triggering cleanup:', error);
      return { cleaned: 0 };
    }
  };

  onMount(() => {
    // Auto-join if enabled and user is available
    if (autoJoin && currentUser) {
      joinPresence();
    }

    // Set up presence change subscription
    presenceSubscription = presenceService.subscribeToPresenceChanges(
      // User joined
      (user: PresenceUser) => {
        setActiveUsers(prev => {
          const exists = prev.some(u => u.user_id === user.user_id);
          if (!exists) {
            logger.debug(`User joined: ${user.nickname}`);
            return [...prev, user];
          }
          return prev;
        });
      },
      // User left
      (userId: string) => {
        setActiveUsers(prev => {
          const user = prev.find(u => u.user_id === userId);
          if (user) {
            logger.debug(`User left: ${user.nickname}`);
          }
          return prev.filter(u => u.user_id !== userId);
        });
      },
      // User updated
      (user: PresenceUser) => {
        setActiveUsers(prev => {
          return prev.map(u => u.user_id === user.user_id ? user : u);
        });
      }
    );

    // Set up periodic stats updates
    statsInterval = window.setInterval(() => {
      updateStats();
    }, 30000); // Update stats every 30 seconds

    // Initial stats load
    updateStats();
  });

  onCleanup(() => {
    // Cleanup subscriptions
    if (presenceSubscription) {
      presenceSubscription();
    }

    if (statsInterval) {
      clearInterval(statsInterval);
    }

    // Leave presence system
    if (isConnected()) {
      leavePresence();
    }
  });

  return {
    // State
    activeUsers: () => convertToUsers(activeUsers()),
    presenceUsers: activeUsers,
    isConnected,
    stats,
    
    // Actions
    joinPresence,
    leavePresence,
    refreshActiveUsers,
    triggerCleanup,
    updateStats,
    
    // Utilities
    getUserCount: () => activeUsers().length,
    isUserOnline: (userId: string) => activeUsers().some(u => u.user_id === userId && u.online),
    getUserPresence: (userId: string) => activeUsers().find(u => u.user_id === userId)
  };
}