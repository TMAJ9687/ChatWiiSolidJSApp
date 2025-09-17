import { createSignal, onMount, onCleanup } from "solid-js";
import { userStatusService, type UserStatusUpdate, type PresenceUpdate } from "../services/supabase/userStatusService";
import type { User } from "../types/user.types";
import { createServiceLogger } from "../utils/logger";

export interface UseRealtimeUserStatusOptions {
  enableStatusUpdates?: boolean;
  enablePresenceUpdates?: boolean;
  enableUserTableChanges?: boolean;
  enablePresenceTableChanges?: boolean;
  subscriptionId?: string;
}

export interface RealtimeUserStatusState {
  users: () => User[];
  userStatuses: () => Map<string, UserStatusUpdate>;
  isConnected: () => boolean;
  lastUpdate: () => string | null;
  connectionAttempts: () => number;
}

const logger = createServiceLogger('useRealtimeUserStatus');

export function useRealtimeUserStatus(
  initialUsers: User[] = [],
  options: UseRealtimeUserStatusOptions = {}
): RealtimeUserStatusState {
  const {
    enableStatusUpdates = true,
    enablePresenceUpdates = true,
    enableUserTableChanges = false,
    enablePresenceTableChanges = false,
    subscriptionId
  } = options;

  // Signals for reactive state
  const [users, setUsers] = createSignal<User[]>(initialUsers);
  const [userStatuses, setUserStatuses] = createSignal<Map<string, UserStatusUpdate>>(new Map());
  const [isConnected, setIsConnected] = createSignal(true);
  const [lastUpdate, setLastUpdate] = createSignal<string | null>(null);
  const [connectionAttempts, setConnectionAttempts] = createSignal(0);

  // Store unsubscribe functions
  let unsubscribeStatusUpdates: (() => void) | undefined;
  let unsubscribePresenceUpdates: (() => void) | undefined;
  let unsubscribeUserTableChanges: (() => void) | undefined;
  let unsubscribePresenceTableChanges: (() => void) | undefined;
  let unsubscribeConnectionMonitor: (() => void) | undefined;

  onMount(() => {
    // Initialize user statuses map
    const statusMap = new Map<string, UserStatusUpdate>();
    initialUsers.forEach(user => {
      statusMap.set(user.id, {
        userId: user.id,
        status: user.status || 'active',
        online: user.online || false,
        lastSeen: user.last_seen,
        timestamp: new Date().toISOString()
      });
    });
    setUserStatuses(statusMap);

    // Subscribe to user status updates
    if (enableStatusUpdates) {
      unsubscribeStatusUpdates = userStatusService.subscribeToUserStatusUpdates(
        handleUserStatusUpdate,
        subscriptionId ? `${subscriptionId}_status` : undefined
      );
    }

    // Subscribe to presence updates
    if (enablePresenceUpdates) {
      unsubscribePresenceUpdates = userStatusService.subscribeToPresenceUpdates(
        handlePresenceUpdate,
        subscriptionId ? `${subscriptionId}_presence` : undefined
      );
    }

    // Subscribe to user table changes
    if (enableUserTableChanges) {
      unsubscribeUserTableChanges = userStatusService.subscribeToUserTableChanges(
        handleUserTableChange,
        subscriptionId ? `${subscriptionId}_user_table` : undefined
      );
    }

    // Subscribe to presence table changes
    if (enablePresenceTableChanges) {
      unsubscribePresenceTableChanges = userStatusService.subscribeToPresenceTableChanges(
        handlePresenceTableChange,
        subscriptionId ? `${subscriptionId}_presence_table` : undefined
      );
    }

    // Monitor connection status
    unsubscribeConnectionMonitor = userStatusService.monitorConnection();
  });

  onCleanup(() => {
    // Cleanup all subscriptions
    if (unsubscribeStatusUpdates) {
      unsubscribeStatusUpdates();
    }
    if (unsubscribePresenceUpdates) {
      unsubscribePresenceUpdates();
    }
    if (unsubscribeUserTableChanges) {
      unsubscribeUserTableChanges();
    }
    if (unsubscribePresenceTableChanges) {
      unsubscribePresenceTableChanges();
    }
    if (unsubscribeConnectionMonitor) {
      unsubscribeConnectionMonitor();
    }
  });

  // Handle user status updates
  const handleUserStatusUpdate = (update: UserStatusUpdate) => {
    logger.debug("Received user status update:", update);
    
    setLastUpdate(new Date().toISOString());
    setIsConnected(true);
    setConnectionAttempts(0);

    // Update user statuses map
    setUserStatuses(prev => {
      const newMap = new Map(prev);
      newMap.set(update.userId, update);
      return newMap;
    });

    // Update users list
    setUsers(prev => {
      return prev.map(user => {
        if (user.id === update.userId) {
          return {
            ...user,
            status: update.status,
            online: update.online,
            last_seen: update.lastSeen,
            kicked_at: update.kickedAt,
            kick_reason: update.kickReason,
            ban_expires_at: update.banExpiresAt,
            ban_reason: update.banReason,
            is_kicked: update.status === 'kicked',
            is_banned: update.status === 'banned'
          };
        }
        return user;
      });
    });
  };

  // Handle presence updates
  const handlePresenceUpdate = (update: PresenceUpdate) => {
    logger.debug("Received presence update:", update);
    
    setLastUpdate(new Date().toISOString());
    setIsConnected(true);

    // Update users list with presence info
    setUsers(prev => {
      return prev.map(user => {
        if (user.id === update.userId) {
          return {
            ...user,
            online: update.online,
            last_seen: update.lastSeen
          };
        }
        return user;
      });
    });

    // Update user statuses map
    setUserStatuses(prev => {
      const newMap = new Map(prev);
      const existingStatus = newMap.get(update.userId);
      if (existingStatus) {
        newMap.set(update.userId, {
          ...existingStatus,
          online: update.online,
          lastSeen: update.lastSeen,
          timestamp: new Date().toISOString()
        });
      }
      return newMap;
    });
  };

  // Handle user table changes (INSERT, UPDATE, DELETE)
  const handleUserTableChange = (user: User, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => {
    logger.debug("User table change:", eventType, user);
    
    setLastUpdate(new Date().toISOString());

    if (eventType === 'INSERT') {
      // Add new user
      setUsers(prev => {
        const exists = prev.some(u => u.id === user.id);
        if (!exists) {
          return [...prev, user];
        }
        return prev;
      });

      // Add to status map
      setUserStatuses(prev => {
        const newMap = new Map(prev);
        newMap.set(user.id, {
          userId: user.id,
          status: user.status || 'active',
          online: user.online || false,
          lastSeen: user.last_seen,
          timestamp: new Date().toISOString()
        });
        return newMap;
      });
    } else if (eventType === 'UPDATE') {
      // Update existing user
      setUsers(prev => {
        return prev.map(u => u.id === user.id ? user : u);
      });

      // Update status map
      setUserStatuses(prev => {
        const newMap = new Map(prev);
        newMap.set(user.id, {
          userId: user.id,
          status: user.status || 'active',
          online: user.online || false,
          lastSeen: user.last_seen,
          kickedAt: user.kicked_at,
          kickReason: user.kick_reason,
          banExpiresAt: user.ban_expires_at,
          banReason: user.ban_reason,
          timestamp: new Date().toISOString()
        });
        return newMap;
      });
    } else if (eventType === 'DELETE') {
      // Remove user
      setUsers(prev => prev.filter(u => u.id !== user.id));
      
      // Remove from status map
      setUserStatuses(prev => {
        const newMap = new Map(prev);
        newMap.delete(user.id);
        return newMap;
      });
    }
  };

  // Handle presence table changes
  const handlePresenceTableChange = (presence: any, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => {
    logger.debug("Presence table change:", eventType, presence);
    
    setLastUpdate(new Date().toISOString());

    if (presence && presence.user_id) {
      // Update users list with presence info
      setUsers(prev => {
        return prev.map(user => {
          if (user.id === presence.user_id) {
            return {
              ...user,
              online: eventType === 'DELETE' ? false : (presence.online || false),
              last_seen: presence.last_seen
            };
          }
          return user;
        });
      });
    }
  };

  // Helper function to get user status by ID
  const getUserStatus = (userId: string): UserStatusUpdate | undefined => {
    return userStatuses().get(userId);
  };

  // Helper function to get online users
  const getOnlineUsers = (): User[] => {
    return users().filter(user => user.online);
  };

  // Helper function to get users by status
  const getUsersByStatus = (status: 'active' | 'kicked' | 'banned' | 'offline'): User[] => {
    return users().filter(user => {
      const userStatus = getUserStatus(user.id);
      return userStatus?.status === status;
    });
  };

  // Helper function to refresh all user statuses
  const refreshUserStatuses = async (): Promise<void> => {
    try {
      const allStatuses = await userStatusService.getAllUsersStatus();
      const statusMap = new Map<string, UserStatusUpdate>();
      
      allStatuses.forEach(status => {
        statusMap.set(status.userId, status);
      });
      
      setUserStatuses(statusMap);
      setLastUpdate(new Date().toISOString());
    } catch (error) {
      logger.error("Error refreshing user statuses:", error);
      setIsConnected(false);
      setConnectionAttempts(prev => prev + 1);
    }
  };

  return {
    users,
    userStatuses,
    isConnected,
    lastUpdate,
    connectionAttempts,
    // Helper functions
    getUserStatus,
    getOnlineUsers,
    getUsersByStatus,
    refreshUserStatuses
  } as RealtimeUserStatusState & {
    getUserStatus: (userId: string) => UserStatusUpdate | undefined;
    getOnlineUsers: () => User[];
    getUsersByStatus: (status: 'active' | 'kicked' | 'banned' | 'offline') => User[];
    refreshUserStatuses: () => Promise<void>;
  };
}