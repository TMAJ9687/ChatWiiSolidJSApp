import { Component, createSignal, onMount, onCleanup, For, Show } from 'solid-js';
import { User } from '../../../types/user.types';
import { adminService } from '../../../services/supabase/adminService';
import { kickService } from '../../../services/supabase/kickService';
import { banService } from '../../../services/supabase/banService';
import { userStatusService } from '../../../services/supabase/userStatusService';
import { useRealtimeUserStatus } from '../../../hooks/useRealtimeUserStatus';
import { supabase } from '../../../config/supabase';
import { UserActionModal } from './UserActionModal';

interface VipUsersListProps {
  onlineOnly?: boolean;
}

interface VipUserActions {
  kick: (userId: string, reason?: string) => Promise<void>;
  ban: (userId: string, reason: string, duration?: number) => Promise<void>;
  edit: (userId: string) => void;
  downgrade: (userId: string) => Promise<void>;
}

export const VipUsersList: Component<VipUsersListProps> = (props) => {
  const [initialUsers, setInitialUsers] = createSignal<User[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [selectedUser, setSelectedUser] = createSignal<User | null>(null);
  const [actionType, setActionType] = createSignal<'kick' | 'ban' | 'edit' | 'downgrade' | null>(null);
  const [currentAdminId, setCurrentAdminId] = createSignal<string>('');

  // Use real-time user status hook
  const realtimeStatus = useRealtimeUserStatus(initialUsers(), {
    enableStatusUpdates: true,
    enablePresenceUpdates: true,
    enableUserTableChanges: true,
    subscriptionId: 'vip-users-list'
  });

  // Load VIP users
  const loadVipUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = {
        role: 'vip',
        onlineOnly: props.onlineOnly || false
      };
      
      const { users: vipUsers } = await adminService.getUsers(filters, 1, 100);
      setInitialUsers(vipUsers);
    } catch (err) {
      console.error('Error loading VIP users:', err);
      setError('Failed to load VIP users');
    } finally {
      setLoading(false);
    }
  };

  // Get current admin ID
  const getCurrentAdminId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentAdminId(user.id);
      }
    } catch (err) {
      console.error('Error getting current admin ID:', err);
    }
  };

  // Set up component initialization
  onMount(async () => {
    await getCurrentAdminId();
    await loadVipUsers();
  });

  // Get filtered users based on onlineOnly prop and real-time updates
  const filteredUsers = () => {
    const users = realtimeStatus.users();
    if (props.onlineOnly) {
      return users.filter(user => user.online && user.role === 'vip');
    }
    return users.filter(user => user.role === 'vip');
  };

  // User actions implementation
  const userActions: VipUserActions = {
    kick: async (userId: string, reason?: string) => {
      try {
        await kickService.kickUser(userId, currentAdminId(), reason);
        // Real-time updates will handle the UI refresh automatically
      } catch (err) {
        console.error('Error kicking user:', err);
        throw err;
      }
    },

    ban: async (userId: string, reason: string, duration?: number) => {
      try {
        await banService.banUser(userId, currentAdminId(), reason, duration);
        // Real-time updates will handle the UI refresh automatically
      } catch (err) {
        console.error('Error banning user:', err);
        throw err;
      }
    },

    edit: (userId: string) => {
      // TODO: Implement edit user functionality
      console.log('Edit user:', userId);
    },

    downgrade: async (userId: string) => {
      try {
        await adminService.updateUserRole(userId, 'standard', currentAdminId());
        // Real-time updates will handle the UI refresh automatically
      } catch (err) {
        console.error('Error downgrading user:', err);
        throw err;
      }
    }
  };

  const handleAction = (user: User, action: 'kick' | 'ban' | 'edit' | 'downgrade') => {
    setSelectedUser(user);
    setActionType(action);
  };

  const handleActionConfirm = async (reason?: string, duration?: number) => {
    const user = selectedUser();
    const action = actionType();
    if (!user || !action) return;

    try {
      switch (action) {
        case 'kick':
          await userActions.kick(user.id, reason);
          break;
        case 'ban':
          await userActions.ban(user.id, reason || 'No reason provided', duration);
          break;
        case 'edit':
          userActions.edit(user.id);
          break;
        case 'downgrade':
          await userActions.downgrade(user.id);
          break;
      }
    } catch (err) {
      console.error(`Error performing ${action} action:`, err);
      throw err;
    } finally {
      setSelectedUser(null);
      setActionType(null);
    }
  };

  const handleActionCancel = () => {
    setSelectedUser(null);
    setActionType(null);
  };

  const getPresenceIndicator = (user: User) => {
    if (user.online) {
      return <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2" title="Online" />;
    }
    return <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mr-2" title="Offline" />;
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    return date.toLocaleString();
  };

  return (
    <Show when={!loading()} fallback={
      <div class="flex items-center justify-center p-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-2">Loading VIP users...</span>
      </div>
    }>
      <Show when={error()} fallback={
        <div class="bg-white shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg leading-6 font-medium text-gray-900">
                VIP Users {props.onlineOnly ? '(Online Only)' : ''}
              </h3>
              <div class="flex items-center space-x-4">
                <Show when={!realtimeStatus.isConnected()}>
                  <span class="text-sm text-red-500">Disconnected</span>
                </Show>
                <span class="text-sm text-gray-500">
                  {filteredUsers().length} user{filteredUsers().length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <Show when={filteredUsers().length === 0} fallback={
              <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table class="min-w-full divide-y divide-gray-300">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        VIP Expires
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <For each={filteredUsers()}>
                      {(user) => (
                        <tr class="hover:bg-gray-50">
                          <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center">
                              {getPresenceIndicator(user)}
                              <div>
                                <div class="text-sm font-medium text-gray-900">
                                  {user.nickname}
                                </div>
                                <div class="text-sm text-gray-500">
                                  {user.age} • {user.gender} • {user.country}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap">
                            <span class={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.status === 'active' 
                                ? 'bg-green-100 text-green-800'
                                : user.status === 'kicked'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.status}
                            </span>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>Last seen: {formatLastSeen(user.last_seen)}</div>
                            <div>Joined: {new Date(user.created_at).toLocaleDateString()}</div>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <Show when={user.vip_expires_at} fallback={
                              <span class="text-gray-400">Never</span>
                            }>
                              <div class={`${
                                new Date(user.vip_expires_at!) < new Date() 
                                  ? 'text-red-600 font-medium' 
                                  : 'text-gray-900'
                              }`}>
                                {new Date(user.vip_expires_at!).toLocaleDateString()}
                              </div>
                            </Show>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() => handleAction(user, 'kick')}
                              class="text-yellow-600 hover:text-yellow-900 bg-yellow-50 hover:bg-yellow-100 px-2 py-1 rounded"
                              disabled={user.status !== 'active'}
                            >
                              Kick
                            </button>
                            <button
                              onClick={() => handleAction(user, 'ban')}
                              class="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded"
                              disabled={user.status === 'banned'}
                            >
                              Ban
                            </button>
                            <button
                              onClick={() => handleAction(user, 'edit')}
                              class="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleAction(user, 'downgrade')}
                              class="text-purple-600 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded"
                            >
                              Downgrade
                            </button>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            }>
              <div class="text-center py-8">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">No VIP users found</h3>
                <p class="mt-1 text-sm text-gray-500">
                  {props.onlineOnly ? 'No VIP users are currently online.' : 'No VIP users exist in the system.'}
                </p>
              </div>
            </Show>
          </div>

          {/* User Action Modal */}
          <Show when={selectedUser() && actionType()}>
            <UserActionModal
              user={selectedUser()!}
              action={actionType()!}
              onConfirm={handleActionConfirm}
              onCancel={handleActionCancel}
            />
          </Show>
        </div>
      }>
        <div class="bg-red-50 border border-red-200 rounded-md p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Error</h3>
              <div class="mt-2 text-sm text-red-700">
                <p>{error()}</p>
              </div>
              <div class="mt-4">
                <button
                  onClick={loadVipUsers}
                  class="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </Show>
  );
};