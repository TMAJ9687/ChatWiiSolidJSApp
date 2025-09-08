import { Component, createSignal, createEffect, onMount, onCleanup } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { supabase } from '../../../config/supabase';
import { authService } from '../../../services/supabase/authService';
import { adminService } from '../../../services/supabase/adminService';
import type { User } from '../../../types/user.types';
import type { AdminAuditLog } from '../../../types/admin.types';

interface AdminPreferencesProps {
  currentUser: User;
}

interface DashboardPreferences {
  theme: 'light' | 'dark' | 'auto';
  autoRefresh: boolean;
  refreshInterval: number; // seconds
  emailNotifications: boolean;
  soundNotifications: boolean;
  compactView: boolean;
  showUserAvatars: boolean;
  defaultPageSize: number;
}

interface AdminSession {
  id: string;
  loginTime: string;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
}

export const AdminPreferences: Component<AdminPreferencesProps> = (props) => {
  const navigate = useNavigate();
  const [preferences, setPreferences] = createSignal<DashboardPreferences>({
    theme: 'light',
    autoRefresh: true,
    refreshInterval: 30,
    emailNotifications: true,
    soundNotifications: false,
    compactView: false,
    showUserAvatars: true,
    defaultPageSize: 50,
  });
  const [recentActivity, setRecentActivity] = createSignal<AdminAuditLog[]>([]);
  const [adminSessions, setAdminSessions] = createSignal<AdminSession[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [isSaving, setIsSaving] = createSignal(false);
  const [isSigningOut, setIsSigningOut] = createSignal(false);
  const [message, setMessage] = createSignal<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load preferences and activity on component mount
  onMount(() => {
    loadPreferences();
    loadRecentActivity();
    loadAdminSessions();
  });

  // Clear messages after 5 seconds
  createEffect(() => {
    const msg = message();
    if (msg) {
      const timer = setTimeout(() => setMessage(null), 5000);
      onCleanup(() => clearTimeout(timer));
    }
  });

  const loadPreferences = async () => {
    try {
      // Load preferences from localStorage or database
      const savedPreferences = localStorage.getItem(`admin-preferences-${props.currentUser.id}`);
      if (savedPreferences) {
        setPreferences(JSON.parse(savedPreferences));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const { logs } = await adminService.getAuditLogs(props.currentUser.id, undefined, 1, 10);
      setRecentActivity(logs);
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const loadAdminSessions = async () => {
    try {
      // Mock admin sessions data - in a real app, this would come from a sessions table
      const mockSessions: AdminSession[] = [
        {
          id: '1',
          loginTime: new Date().toISOString(),
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          isActive: true,
        },
      ];
      setAdminSessions(mockSessions);
    } catch (error) {
      console.error('Error loading admin sessions:', error);
    }
  };

  const savePreferences = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem(`admin-preferences-${props.currentUser.id}`, JSON.stringify(preferences()));
      
      // Log admin action
      await adminService.performUserAction({
        type: 'edit',
        userId: props.currentUser.id,
        adminId: props.currentUser.id,
        reason: 'Admin preferences update',
      });

      setMessage({ type: 'success', text: 'Preferences saved successfully!' });
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to save preferences' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreferenceChange = (key: keyof DashboardPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const navigateToChat = () => {
    navigate('/chat');
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      // Log admin action
      await adminService.performUserAction({
        type: 'edit',
        userId: props.currentUser.id,
        adminId: props.currentUser.id,
        reason: 'Admin logout',
      });

      await authService.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to sign out. Please try again.' 
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  const formatActivityAction = (action: string): string => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div class="space-y-8">
      {/* Navigation Shortcuts */}
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-6">Quick Actions</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={navigateToChat}
            class="flex items-center justify-center space-x-3 bg-blue-500 hover:bg-blue-600 text-white px-6 py-4 rounded-lg font-medium transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Go to Chat</span>
          </button>

          <button
            onClick={handleSignOut}
            disabled={isSigningOut()}
            class="flex items-center justify-center space-x-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-6 py-4 rounded-lg font-medium transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>{isSigningOut() ? 'Signing Out...' : 'Logout'}</span>
          </button>
        </div>
      </div>

      {/* Dashboard Preferences */}
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-6">Dashboard Preferences</h2>
        
        <div class="space-y-6">
          {/* Theme Selection */}
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-medium text-gray-800">Theme</h3>
              <p class="text-sm text-gray-600">Choose your preferred dashboard appearance</p>
            </div>
            <select
              value={preferences().theme}
              onChange={(e) => handlePreferenceChange('theme', e.currentTarget.value)}
              class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>

          {/* Auto Refresh */}
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-medium text-gray-800">Auto-refresh Dashboard</h3>
              <p class="text-sm text-gray-600">Automatically refresh dashboard data</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences().autoRefresh}
                onChange={(e) => handlePreferenceChange('autoRefresh', e.currentTarget.checked)}
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Refresh Interval */}
          {preferences().autoRefresh && (
            <div class="flex items-center justify-between pl-6">
              <div>
                <h3 class="font-medium text-gray-800">Refresh Interval</h3>
                <p class="text-sm text-gray-600">How often to refresh data (seconds)</p>
              </div>
              <select
                value={preferences().refreshInterval}
                onChange={(e) => handlePreferenceChange('refreshInterval', parseInt(e.currentTarget.value))}
                class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
              </select>
            </div>
          )}

          {/* Email Notifications */}
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-medium text-gray-800">Email Notifications</h3>
              <p class="text-sm text-gray-600">Receive email alerts for important admin events</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences().emailNotifications}
                onChange={(e) => handlePreferenceChange('emailNotifications', e.currentTarget.checked)}
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Sound Notifications */}
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-medium text-gray-800">Sound Notifications</h3>
              <p class="text-sm text-gray-600">Play sounds for admin alerts</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences().soundNotifications}
                onChange={(e) => handlePreferenceChange('soundNotifications', e.currentTarget.checked)}
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Compact View */}
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-medium text-gray-800">Compact View</h3>
              <p class="text-sm text-gray-600">Use compact layout for data tables</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences().compactView}
                onChange={(e) => handlePreferenceChange('compactView', e.currentTarget.checked)}
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Show User Avatars */}
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-medium text-gray-800">Show User Avatars</h3>
              <p class="text-sm text-gray-600">Display user avatars in lists and tables</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences().showUserAvatars}
                onChange={(e) => handlePreferenceChange('showUserAvatars', e.currentTarget.checked)}
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Default Page Size */}
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-medium text-gray-800">Default Page Size</h3>
              <p class="text-sm text-gray-600">Number of items to show per page</p>
            </div>
            <select
              value={preferences().defaultPageSize}
              onChange={(e) => handlePreferenceChange('defaultPageSize', parseInt(e.currentTarget.value))}
              class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={25}>25 items</option>
              <option value={50}>50 items</option>
              <option value={100}>100 items</option>
              <option value={200}>200 items</option>
            </select>
          </div>

          {/* Save Button */}
          <div class="flex justify-end pt-4 border-t border-gray-200">
            <button
              onClick={savePreferences}
              disabled={isSaving()}
              class="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              {isSaving() ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Admin Activity */}
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-6">Recent Activity</h2>
        
        <div class="space-y-3">
          {recentActivity().length > 0 ? (
            recentActivity().map((activity) => (
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <p class="font-medium text-gray-800">{formatActivityAction(activity.action)}</p>
                  <p class="text-sm text-gray-600">
                    Target: {activity.targetType} {activity.targetId && `(${activity.targetId.slice(0, 8)}...)`}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-sm text-gray-500">{formatDate(activity.createdAt)}</p>
                </div>
              </div>
            ))
          ) : (
            <div class="text-center py-8 text-gray-500">
              <p>No recent activity found</p>
            </div>
          )}
        </div>
      </div>

      {/* Admin Session Management */}
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-6">Session Management</h2>
        
        <div class="space-y-3">
          {adminSessions().map((session) => (
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-md">
              <div>
                <div class="flex items-center space-x-2">
                  <div class={`w-3 h-3 rounded-full ${session.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <p class="font-medium text-gray-800">
                    {session.isActive ? 'Current Session' : 'Inactive Session'}
                  </p>
                </div>
                <p class="text-sm text-gray-600 mt-1">
                  Login: {formatDate(session.loginTime)}
                </p>
                {session.ipAddress && (
                  <p class="text-sm text-gray-600">IP: {session.ipAddress}</p>
                )}
              </div>
              <div class="text-right">
                {session.isActive && (
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message Display */}
      {message() && (
        <div class={`p-4 rounded-md ${
          message()!.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          {message()!.text}
        </div>
      )}
    </div>
  );
};