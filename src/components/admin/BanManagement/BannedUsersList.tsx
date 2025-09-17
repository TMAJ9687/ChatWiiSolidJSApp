import React, { useState, useEffect } from 'react';
import { banService, type Ban } from '../../../services/supabase/banService';
import { adminService } from '../../../services/supabase/adminService';
import type { AdminActionResult } from '../../../types/admin.types';
import { createServiceLogger } from '../../../utils/logger';

interface BannedUsersListProps {
  onRefresh?: () => void;
}

interface BanWithUserInfo extends Ban {
  userNickname?: string;
  adminNickname?: string;
}

const logger = createServiceLogger('BannedUsersList');

export const BannedUsersList: React.FC<BannedUsersListProps> = ({ onRefresh }) => {
  const [bans, setBans] = useState<BanWithUserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedBanId, setSelectedBanId] = useState<string | null>(null);
  const [unbanLoading, setUnbanLoading] = useState<string | null>(null);
  const [showUnbanConfirm, setShowUnbanConfirm] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    loadBans();
  }, [page]);

  const loadBans = async () => {
    try {
      setLoading(true);
      setError(null);

      const { bans: banData, total: totalCount } = await banService.getActiveBans(page, ITEMS_PER_PAGE);
      
      // Enrich bans with user and admin information
      const enrichedBans = await Promise.all(
        banData.map(async (ban) => {
          const enrichedBan: BanWithUserInfo = { ...ban };
          
          try {
            // Get user nickname if it's a user ban
            if (ban.userId) {
              const userInfo = await adminService.getUserById(ban.userId);
              if (userInfo) {
                enrichedBan.userNickname = userInfo.nickname;
              }
            }
            
            // Get admin nickname
            const adminInfo = await adminService.getUserById(ban.bannedBy);
            if (adminInfo) {
              enrichedBan.adminNickname = adminInfo.nickname;
            }
          } catch (err) {
            logger.warn('Failed to enrich ban data:', err);
          }
          
          return enrichedBan;
        })
      );

      setBans(enrichedBans);
      setTotal(totalCount);
    } catch (err) {
      logger.error('Error loading bans:', err);
      setError('Failed to load banned users');
    } finally {
      setLoading(false);
    }
  };

  const handleUnban = async (ban: BanWithUserInfo) => {
    if (!ban.id) return;

    try {
      setUnbanLoading(ban.id);
      
      let result: AdminActionResult;
      
      if (ban.userId) {
        // Unban user
        result = await banService.unbanUser(ban.userId, 'current-admin-id'); // TODO: Get actual admin ID
      } else if (ban.ipAddress) {
        // Unban IP
        result = await banService.unbanIP(ban.ipAddress, 'current-admin-id'); // TODO: Get actual admin ID
      } else {
        throw new Error('Invalid ban record');
      }

      if (result.success) {
        // Refresh the list
        await loadBans();
        onRefresh?.();
        setShowUnbanConfirm(null);
      } else {
        setError(result.message || 'Failed to unban');
      }
    } catch (err) {
      logger.error('Error unbanning:', err);
      setError(err instanceof Error ? err.message : 'Failed to unban');
    } finally {
      setUnbanLoading(null);
    }
  };

  const formatDuration = (durationHours?: number) => {
    if (!durationHours) return 'Permanent';
    
    if (durationHours < 24) {
      return `${durationHours} hour${durationHours !== 1 ? 's' : ''}`;
    } else if (durationHours < 24 * 7) {
      const days = Math.floor(durationHours / 24);
      return `${days} day${days !== 1 ? 's' : ''}`;
    } else {
      const weeks = Math.floor(durationHours / (24 * 7));
      return `${weeks} week${weeks !== 1 ? 's' : ''}`;
    }
  };

  const formatExpiryDate = (expiresAt?: string) => {
    if (!expiresAt) return 'Never';
    
    const date = new Date(expiresAt);
    const now = new Date();
    
    if (date < now) {
      return 'Expired';
    }
    
    return date.toLocaleString();
  };

  const getBanTarget = (ban: BanWithUserInfo) => {
    if (ban.userId && ban.userNickname) {
      return `User: ${ban.userNickname}`;
    } else if (ban.userId) {
      return `User ID: ${ban.userId}`;
    } else if (ban.ipAddress) {
      return `IP: ${ban.ipAddress}`;
    }
    return 'Unknown';
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading && bans.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading banned users...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Banned Users & IPs</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            {showHistory ? 'Hide History' : 'Show History'}
          </button>
          <button
            onClick={loadBans}
            disabled={loading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {bans.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No banned users or IPs found
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Banned By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bans.map((ban) => (
                  <tr key={ban.id} className={isExpired(ban.expiresAt) ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {getBanTarget(ban)}
                      </div>
                      {ban.userId && (
                        <div className="text-xs text-gray-500">ID: {ban.userId}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={ban.reason}>
                        {ban.reason}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        ban.durationHours 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {formatDuration(ban.durationHours)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={isExpired(ban.expiresAt) ? 'text-red-600 font-medium' : ''}>
                        {formatExpiryDate(ban.expiresAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ban.adminNickname || 'Unknown Admin'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(ban.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {showUnbanConfirm === ban.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUnban(ban)}
                            disabled={unbanLoading === ban.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            {unbanLoading === ban.id ? 'Unbanning...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setShowUnbanConfirm(null)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowUnbanConfirm(ban.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Unban
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, total)} of {total} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  Page {page} of {Math.ceil(total / ITEMS_PER_PAGE)}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= Math.ceil(total / ITEMS_PER_PAGE)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Ban History Modal */}
      {showHistory && (
        <BanHistoryModal
          onClose={() => setShowHistory(false)}
          selectedBanId={selectedBanId}
        />
      )}
    </div>
  );
};

// Ban History Modal Component
interface BanHistoryModalProps {
  onClose: () => void;
  selectedBanId?: string | null;
}

const BanHistoryModal: React.FC<BanHistoryModalProps> = ({ onClose, selectedBanId }) => {
  const [historyBans, setHistoryBans] = useState<BanWithUserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchType, setSearchType] = useState<'user' | 'ip'>('user');
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    if (selectedBanId) {
      loadBanHistory();
    }
  }, [selectedBanId, searchValue, searchType]);

  const loadBanHistory = async () => {
    if (!searchValue.trim()) {
      setHistoryBans([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      let bans: Ban[] = [];
      
      if (searchType === 'user') {
        // For user search, we'd need to first find the user ID by nickname
        // This is a simplified version - in practice, you'd want a user search endpoint
        bans = await banService.getUserBanHistory(searchValue);
      } else {
        bans = await banService.getIPBanHistory(searchValue);
      }

      // Enrich with user info
      const enrichedBans = await Promise.all(
        bans.map(async (ban) => {
          const enrichedBan: BanWithUserInfo = { ...ban };
          
          try {
            if (ban.userId) {
              const userInfo = await adminService.getUserById(ban.userId);
              if (userInfo) {
                enrichedBan.userNickname = userInfo.nickname;
              }
            }
            
            const adminInfo = await adminService.getUserById(ban.bannedBy);
            if (adminInfo) {
              enrichedBan.adminNickname = adminInfo.nickname;
            }
          } catch (err) {
            logger.warn('Failed to enrich ban history data:', err);
          }
          
          return enrichedBan;
        })
      );

      setHistoryBans(enrichedBans);
    } catch (err) {
      logger.error('Error loading ban history:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Ban History</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex gap-4 mb-4">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as 'user' | 'ip')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="user">Search by User ID</option>
              <option value="ip">Search by IP Address</option>
            </select>
            <input
              type="text"
              placeholder={searchType === 'user' ? 'Enter user ID...' : 'Enter IP address...'}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={loadBanHistory}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Search
            </button>
          </div>

          <div className="overflow-y-auto max-h-96">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading history...</span>
              </div>
            ) : historyBans.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchValue ? 'No ban history found' : 'Enter a search term to view ban history'}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Banned By</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {historyBans.map((ban) => (
                    <tr key={ban.id}>
                      <td className="px-4 py-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          ban.isActive 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {ban.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">{ban.reason}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{formatDuration(ban.durationHours)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{ban.adminNickname || 'Unknown'}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{new Date(ban.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function for duration formatting (duplicated for the modal)
const formatDuration = (durationHours?: number) => {
  if (!durationHours) return 'Permanent';
  
  if (durationHours < 24) {
    return `${durationHours} hour${durationHours !== 1 ? 's' : ''}`;
  } else if (durationHours < 24 * 7) {
    const days = Math.floor(durationHours / 24);
    return `${days} day${days !== 1 ? 's' : ''}`;
  } else {
    const weeks = Math.floor(durationHours / (24 * 7));
    return `${weeks} week${weeks !== 1 ? 's' : ''}`;
  }
};