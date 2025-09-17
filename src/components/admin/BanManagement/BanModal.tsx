import React, { useState, useEffect } from 'react';
import { banService } from '../../../services/supabase/banService';
import { adminService } from '../../../services/supabase/adminService';
import type { AdminActionResult } from '../../../types/admin.types';
import { createServiceLogger } from '../../../utils/logger';

interface BanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetUserId?: string;
  targetUserNickname?: string;
  targetIP?: string;
}

interface BanFormData {
  targetType: 'user' | 'ip';
  userId: string;
  ipAddress: string;
  reason: string;
  durationType: 'temporary' | 'permanent';
  durationValue: number;
  durationUnit: 'hours' | 'days' | 'weeks';
}

const PRESET_REASONS = [
  'Spam or advertising',
  'Harassment or abuse',
  'Inappropriate content',
  'Violation of community guidelines',
  'Multiple rule violations',
  'Impersonation',
  'Hate speech',
  'Doxxing or sharing personal information',
  'Circumventing previous ban',
  'Other (specify below)'
];

const DURATION_PRESETS = [
  { label: '1 Hour', hours: 1 },
  { label: '6 Hours', hours: 6 },
  { label: '12 Hours', hours: 12 },
  { label: '1 Day', hours: 24 },
  { label: '3 Days', hours: 72 },
  { label: '1 Week', hours: 168 },
  { label: '2 Weeks', hours: 336 },
  { label: '1 Month', hours: 720 },
  { label: '3 Months', hours: 2160 },
  { label: '6 Months', hours: 4320 },
  { label: '1 Year', hours: 8760 }
];

const logger = createServiceLogger('BanModal');

export const BanModal: React.FC<BanModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetUserId,
  targetUserNickname,
  targetIP
}) => {
  const [formData, setFormData] = useState<BanFormData>({
    targetType: targetUserId ? 'user' : 'ip',
    userId: targetUserId || '',
    ipAddress: targetIP || '',
    reason: '',
    durationType: 'temporary',
    durationValue: 24,
    durationUnit: 'hours'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [existingBanCheck, setExistingBanCheck] = useState<string | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        targetType: targetUserId ? 'user' : 'ip',
        userId: targetUserId || '',
        ipAddress: targetIP || '',
        reason: '',
        durationType: 'temporary',
        durationValue: 24,
        durationUnit: 'hours'
      });
      setError(null);
      setExistingBanCheck(null);
    }
  }, [isOpen, targetUserId, targetIP]);

  // Check for existing bans when target changes
  useEffect(() => {
    if (formData.targetType === 'user' && formData.userId) {
      checkExistingUserBan(formData.userId);
    } else if (formData.targetType === 'ip' && formData.ipAddress) {
      checkExistingIPBan(formData.ipAddress);
    }
  }, [formData.targetType, formData.userId, formData.ipAddress]);

  const checkExistingUserBan = async (userId: string) => {
    try {
      const isBanned = await banService.isUserBanned(userId);
      if (isBanned) {
        setExistingBanCheck('This user is already banned');
      } else {
        setExistingBanCheck(null);
      }
    } catch (err) {
      logger.warn('Failed to check existing user ban:', err);
    }
  };

  const checkExistingIPBan = async (ipAddress: string) => {
    try {
      const isBanned = await banService.isIPBanned(ipAddress);
      if (isBanned) {
        setExistingBanCheck('This IP address is already banned');
      } else {
        setExistingBanCheck(null);
      }
    } catch (err) {
      logger.warn('Failed to check existing IP ban:', err);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUserSearchResults([]);
      return;
    }

    try {
      setUserSearchLoading(true);
      // This would need to be implemented in adminService
      // For now, we'll use a placeholder
      const results = await adminService.searchUsers({ search: query });
      setUserSearchResults(results || []);
    } catch (err) {
      logger.error('Error searching users:', err);
      setUserSearchResults([]);
    } finally {
      setUserSearchLoading(false);
    }
  };

  const handleUserSearch = (query: string) => {
    setUserSearchQuery(query);
    if (query.length >= 2) {
      searchUsers(query);
    } else {
      setUserSearchResults([]);
    }
  };

  const selectUser = (user: any) => {
    setFormData(prev => ({
      ...prev,
      userId: user.id
    }));
    setUserSearchQuery(user.nickname);
    setShowUserSearch(false);
    setUserSearchResults([]);
  };

  const calculateDurationHours = () => {
    if (formData.durationType === 'permanent') {
      return undefined;
    }

    let multiplier = 1;
    switch (formData.durationUnit) {
      case 'days':
        multiplier = 24;
        break;
      case 'weeks':
        multiplier = 24 * 7;
        break;
      default:
        multiplier = 1;
    }

    return formData.durationValue * multiplier;
  };

  const getExpiryDate = () => {
    if (formData.durationType === 'permanent') {
      return 'Never (Permanent Ban)';
    }

    const hours = calculateDurationHours();
    if (!hours) return 'Never';

    const expiryDate = new Date(Date.now() + hours * 60 * 60 * 1000);
    return expiryDate.toLocaleString();
  };

  const validateForm = (): string | null => {
    if (formData.targetType === 'user') {
      if (!formData.userId.trim()) {
        return 'Please select a user to ban';
      }
    } else {
      if (!formData.ipAddress.trim()) {
        return 'Please enter an IP address to ban';
      }
      
      // Basic IP validation
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipRegex.test(formData.ipAddress)) {
        return 'Please enter a valid IP address';
      }
    }

    if (!formData.reason.trim()) {
      return 'Please provide a reason for the ban';
    }

    if (formData.durationType === 'temporary') {
      if (formData.durationValue <= 0) {
        return 'Duration must be greater than 0';
      }
      
      const maxHours = 24 * 365; // 1 year max
      const hours = calculateDurationHours();
      if (hours && hours > maxHours) {
        return 'Ban duration cannot exceed 1 year';
      }
    }

    if (existingBanCheck) {
      return existingBanCheck;
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const durationHours = calculateDurationHours();
      const adminId = 'current-admin-id'; // TODO: Get actual admin ID from context

      let result: AdminActionResult;

      if (formData.targetType === 'user') {
        result = await banService.banUser(
          formData.userId,
          adminId,
          formData.reason,
          durationHours
        );
      } else {
        result = await banService.banIP(
          formData.ipAddress,
          adminId,
          formData.reason,
          durationHours
        );
      }

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.message || 'Failed to create ban');
      }
    } catch (err) {
      logger.error('Error creating ban:', err);
      setError(err instanceof Error ? err.message : 'Failed to create ban');
    } finally {
      setLoading(false);
    }
  };

  const setPresetDuration = (hours: number) => {
    if (hours < 24) {
      setFormData(prev => ({
        ...prev,
        durationType: 'temporary',
        durationValue: hours,
        durationUnit: 'hours'
      }));
    } else if (hours < 24 * 7) {
      setFormData(prev => ({
        ...prev,
        durationType: 'temporary',
        durationValue: hours / 24,
        durationUnit: 'days'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        durationType: 'temporary',
        durationValue: hours / (24 * 7),
        durationUnit: 'weeks'
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Create Ban</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {existingBanCheck && (
            <div className="p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-md">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {existingBanCheck}
              </div>
            </div>
          )}

          {/* Target Selection */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ban Target Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="targetType"
                    value="user"
                    checked={formData.targetType === 'user'}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetType: e.target.value as 'user' | 'ip' }))}
                    className="mr-2"
                  />
                  User Account
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="targetType"
                    value="ip"
                    checked={formData.targetType === 'ip'}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetType: e.target.value as 'user' | 'ip' }))}
                    className="mr-2"
                  />
                  IP Address
                </label>
              </div>
            </div>

            {formData.targetType === 'user' ? (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User to Ban
                </label>
                {targetUserNickname ? (
                  <div className="p-3 bg-gray-100 rounded-md">
                    <span className="font-medium">{targetUserNickname}</span>
                    <span className="text-sm text-gray-500 ml-2">({targetUserId})</span>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Search for user by nickname..."
                      value={userSearchQuery}
                      onChange={(e) => handleUserSearch(e.target.value)}
                      onFocus={() => setShowUserSearch(true)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    
                    {showUserSearch && userSearchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {userSearchResults.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => selectUser(user)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center justify-between"
                          >
                            <span>{user.nickname}</span>
                            <span className="text-sm text-gray-500">{user.role}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {userSearchLoading && (
                      <div className="absolute right-3 top-9">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IP Address to Ban
                </label>
                <input
                  type="text"
                  placeholder="e.g., 192.168.1.1"
                  value={formData.ipAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, ipAddress: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Ban
            </label>
            <select
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            >
              <option value="">Select a reason...</option>
              {PRESET_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
            
            {(formData.reason === 'Other (specify below)' || !PRESET_REASONS.includes(formData.reason)) && (
              <textarea
                placeholder="Please specify the reason for this ban..."
                value={formData.reason === 'Other (specify below)' ? '' : formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          {/* Duration Selection */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ban Duration
              </label>
              <div className="flex gap-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="durationType"
                    value="temporary"
                    checked={formData.durationType === 'temporary'}
                    onChange={(e) => setFormData(prev => ({ ...prev, durationType: e.target.value as 'temporary' | 'permanent' }))}
                    className="mr-2"
                  />
                  Temporary
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="durationType"
                    value="permanent"
                    checked={formData.durationType === 'permanent'}
                    onChange={(e) => setFormData(prev => ({ ...prev, durationType: e.target.value as 'temporary' | 'permanent' }))}
                    className="mr-2"
                  />
                  Permanent
                </label>
              </div>
            </div>

            {formData.durationType === 'temporary' && (
              <>
                {/* Duration Presets */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick Duration Presets
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {DURATION_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setPresetDuration(preset.hours)}
                        className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Duration
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={formData.durationValue}
                      onChange={(e) => setFormData(prev => ({ ...prev, durationValue: parseInt(e.target.value) || 1 }))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={formData.durationUnit}
                      onChange={(e) => setFormData(prev => ({ ...prev, durationUnit: e.target.value as 'hours' | 'days' | 'weeks' }))}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Ban Preview */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-medium text-gray-800 mb-2">Ban Preview</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <div>
                <span className="font-medium">Target:</span>{' '}
                {formData.targetType === 'user' 
                  ? (targetUserNickname || userSearchQuery || 'No user selected')
                  : (formData.ipAddress || 'No IP address entered')
                }
              </div>
              <div>
                <span className="font-medium">Reason:</span> {formData.reason || 'No reason provided'}
              </div>
              <div>
                <span className="font-medium">Duration:</span>{' '}
                {formData.durationType === 'permanent' ? 'Permanent' : `${formData.durationValue} ${formData.durationUnit}`}
              </div>
              <div>
                <span className="font-medium">Expires:</span> {getExpiryDate()}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !!existingBanCheck}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating Ban...' : 'Create Ban'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};