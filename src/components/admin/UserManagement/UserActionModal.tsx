import React, { useState } from 'react';
import { User } from '../../../types/user.types';
import { createServiceLogger } from '../../../utils/logger';

interface UserActionModalProps {
  user: User;
  action: 'kick' | 'ban' | 'edit' | 'upgrade' | 'downgrade';
  onConfirm: (reason?: string, duration?: number) => Promise<void>;
  onCancel: () => void;
}

const logger = createServiceLogger('UserActionModal');

export const UserActionModal: React.FC<UserActionModalProps> = ({
  user,
  action,
  onConfirm,
  onCancel
}) => {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState<number>(24); // Default 24 hours for bans
  const [vipDuration, setVipDuration] = useState<number>(30); // Default 30 days for VIP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getActionTitle = () => {
    switch (action) {
      case 'kick':
        return 'Kick User';
      case 'ban':
        return 'Ban User';
      case 'edit':
        return 'Edit User';
      case 'upgrade':
        return 'Upgrade to VIP';
      case 'downgrade':
        return 'Downgrade to Standard';
      default:
        return 'User Action';
    }
  };

  const getActionDescription = () => {
    switch (action) {
      case 'kick':
        return 'This will immediately remove the user from the chat and redirect them to the landing page. They can rejoin immediately.';
      case 'ban':
        return 'This will prevent the user from accessing the chat for the specified duration. They will be redirected to the landing page.';
      case 'edit':
        return 'Edit user profile information and settings.';
      case 'upgrade':
        return 'This will upgrade the user to VIP status with the specified duration.';
      case 'downgrade':
        return 'This will remove VIP status and downgrade the user to standard membership.';
      default:
        return '';
    }
  };

  const getActionButtonText = () => {
    switch (action) {
      case 'kick':
        return 'Kick User';
      case 'ban':
        return 'Ban User';
      case 'edit':
        return 'Save Changes';
      case 'upgrade':
        return 'Upgrade User';
      case 'downgrade':
        return 'Downgrade User';
      default:
        return 'Confirm';
    }
  };

  const getActionButtonColor = () => {
    switch (action) {
      case 'kick':
        return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
      case 'ban':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
      case 'edit':
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
      case 'upgrade':
        return 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
      case 'downgrade':
        return 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500';
      default:
        return 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500';
    }
  };

  const requiresReason = () => {
    return action === 'kick' || action === 'ban';
  };

  const showDurationInput = () => {
    return action === 'ban';
  };

  const showVipDurationInput = () => {
    return action === 'upgrade';
  };

  const validateForm = () => {
    if (requiresReason() && !reason.trim()) {
      setError('Reason is required for this action');
      return false;
    }
    
    if (showDurationInput() && (!duration || duration < 1)) {
      setError('Duration must be at least 1 hour');
      return false;
    }
    
    if (showVipDurationInput() && (!vipDuration || vipDuration < 1)) {
      setError('VIP duration must be at least 1 day');
      return false;
    }
    
    return true;
  };

  const handleConfirm = async () => {
    setError(null);
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      if (action === 'upgrade') {
        await onConfirm(reason || undefined, vipDuration);
      } else if (action === 'ban') {
        await onConfirm(reason, duration);
      } else {
        await onConfirm(reason || undefined);
      }
    } catch (err) {
      logger.error(`Error performing ${action} action:`, err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getDurationOptions = () => {
    return [
      { value: 1, label: '1 hour' },
      { value: 6, label: '6 hours' },
      { value: 12, label: '12 hours' },
      { value: 24, label: '1 day' },
      { value: 72, label: '3 days' },
      { value: 168, label: '1 week' },
      { value: 720, label: '1 month' },
      { value: 0, label: 'Permanent' }
    ];
  };

  const getVipDurationOptions = () => {
    return [
      { value: 7, label: '1 week' },
      { value: 30, label: '1 month' },
      { value: 90, label: '3 months' },
      { value: 180, label: '6 months' },
      { value: 365, label: '1 year' }
    ];
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {getActionTitle()}
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User Info */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{user.nickname}</p>
                <p className="text-sm text-gray-500">
                  {user.age} • {user.gender} • {user.country} • {user.role}
                </p>
                <p className="text-xs text-gray-400">
                  Status: {user.status} • {user.online ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Description */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              {getActionDescription()}
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Reason Input */}
            {requiresReason() && (
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                  Reason {action === 'ban' ? '(Required)' : '(Optional)'}
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={`Enter reason for ${action}...`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  required={action === 'ban'}
                />
              </div>
            )}

            {/* Ban Duration Input */}
            {showDurationInput() && (
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                  Ban Duration
                </label>
                <select
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {getDurationOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* VIP Duration Input */}
            {showVipDurationInput() && (
              <div>
                <label htmlFor="vipDuration" className="block text-sm font-medium text-gray-700 mb-1">
                  VIP Duration
                </label>
                <select
                  id="vipDuration"
                  value={vipDuration}
                  onChange={(e) => setVipDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {getVipDurationOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 mt-6">
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${getActionButtonColor()}`}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                getActionButtonText()
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};