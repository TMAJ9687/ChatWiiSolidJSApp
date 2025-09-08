import React, { useState, useEffect } from 'react';
import { User } from '../../../types/user.types';
import { adminService } from '../../../services/supabase/adminService';
import { kickService } from '../../../services/supabase/kickService';
import { banService } from '../../../services/supabase/banService';
import { supabase } from '../../../config/supabase';
import { UserActionModal } from './UserActionModal';

interface StandardUsersListProps {
  onlineOnly: boolean; // Always true for standard users per requirements
}

interface StandardUserActions {
  kick: (userId: string, reason?: string) => Promise<void>;
  ban: (userId: string, reason: string, duration?: number) => Promise<void>;
  edit: (userId: string) => void;
  upgradeToVip: (userId: string, duration: number) => Promise<void>;
}

export const StandardUsersList: React.FC<StandardUsersListProps> = ({ onlineOnly }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'kick' | 'ban' | 'edit' | 'upgrade' | null>(null);
  const [currentAdminId, setCurrentAdminId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');

  // Load standard users
  const loadStandardUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = {
        role: 'standard',
        onlineOnly,
        search: searchTerm || undefined,
        country: countryFilter || undefined,
        gender: genderFilter || undefined
      };
      
      const { users: standardUsers } = await adminService.getUsers(filters, 1, 200);
      setUsers(standardUsers);
    } catch (err) {
      console.error('Error loading standard users:', err);
      setError('Failed to load standard users');
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

  // Set up real-time subscriptions for user status updates
  useEffect(() => {
    getCurrentAdminId();
    loadStandardUsers();

    // Subscribe to user changes
    const userSubscription = supabase
      .channel('standard-users-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: 'role=eq.standard'
        },
        () => {
          loadStandardUsers(); // Reload users when changes occur
        }
      )
      .subscribe();

    // Subscribe to presence changes
    const presenceSubscription = supabase
      .channel('standard-presence-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'presence'
        },
        () => {
          loadStandardUsers(); // Reload users when presence changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userSubscription);
      supabase.removeChannel(presenceSubscription);
    };
  }, [onlineOnly, searchTerm, countryFilter, genderFilter]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadStandardUsers();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // User actions implementation
  const userActions: StandardUserActions = {
    kick: async (userId: string, reason?: string) => {
      try {
        await kickService.kickUser(userId, currentAdminId, reason);
        await loadStandardUsers(); // Refresh the list
      } catch (err) {
        console.error('Error kicking user:', err);
        throw err;
      }
    },

    ban: async (userId: string, reason: string, duration?: number) => {
      try {
        await banService.banUser(userId, currentAdminId, reason, duration);
        await loadStandardUsers(); // Refresh the list
      } catch (err) {
        console.error('Error banning user:', err);
        throw err;
      }
    },

    edit: (userId: string) => {
      // TODO: Implement edit user functionality
      console.log('Edit user:', userId);
    },

    upgradeToVip: async (userId: string, duration: number) => {
      try {
        await adminService.updateUserRole(userId, 'vip', currentAdminId, duration);
        await loadStandardUsers(); // Refresh the list
      } catch (err) {
        console.error('Error upgrading user to VIP:', err);
        throw err;
      }
    }
  };

  const handleAction = (user: User, action: 'kick' | 'ban' | 'edit' | 'upgrade') => {
    setSelectedUser(user);
    setActionType(action);
  };

  const handleActionConfirm = async (reason?: string, duration?: number) => {
    if (!selectedUser || !actionType) return;

    try {
      switch (actionType) {
        case 'kick':
          await userActions.kick(selectedUser.id, reason);
          break;
        case 'ban':
          await userActions.ban(selectedUser.id, reason || 'No reason provided', duration);
          break;
        case 'edit':
          userActions.edit(selectedUser.id);
          break;
        case 'upgrade':
          await userActions.upgradeToVip(selectedUser.id, duration || 30);
          break;
      }
    } catch (err) {
      console.error(`Error performing ${actionType} action:`, err);
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

  const formatLastSeen = (lastSeen?: number) => {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    return date.toLocaleString();
  };

  // Get unique countries and genders for filters
  const getUniqueCountries = () => {
    const countries = [...new Set(users.map(user => user.country))].sort();
    return countries;
  };

  const getUniqueGenders = () => {
    return ['male', 'female'];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading standard users...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={loadStandardUsers}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Standard Users {onlineOnly ? '(Online Only)' : ''}
          </h3>
          <span className="text-sm text-gray-500">
            {users.length} user{users.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Filters */}
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search by nickname
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by country
            </label>
            <select
              id="country"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All countries</option>
              {getUniqueCountries().map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by gender
            </label>
            <select
              id="gender"
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All genders</option>
              {getUniqueGenders().map((gender) => (
                <option key={gender} value={gender}>
                  {gender.charAt(0).toUpperCase() + gender.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No standard users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {onlineOnly ? 'No standard users are currently online.' : 'No standard users match the current filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getPresenceIndicator(user)}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.nickname}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.age} • {user.gender} • {user.country}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : user.status === 'kicked'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>Last seen: {formatLastSeen(user.lastSeen)}</div>
                      <div>ID: {user.id.slice(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleAction(user, 'kick')}
                        className="text-yellow-600 hover:text-yellow-900 bg-yellow-50 hover:bg-yellow-100 px-2 py-1 rounded"
                        disabled={user.status !== 'active'}
                      >
                        Kick
                      </button>
                      <button
                        onClick={() => handleAction(user, 'ban')}
                        className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded"
                        disabled={user.status === 'banned'}
                      >
                        Ban
                      </button>
                      <button
                        onClick={() => handleAction(user, 'edit')}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleAction(user, 'upgrade')}
                        className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-2 py-1 rounded"
                      >
                        Upgrade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Action Modal */}
      {selectedUser && actionType && (
        <UserActionModal
          user={selectedUser}
          action={actionType}
          onConfirm={handleActionConfirm}
          onCancel={handleActionCancel}
        />
      )}
    </div>
  );
};