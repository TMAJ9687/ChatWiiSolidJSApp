import { Component, createSignal, createEffect, onCleanup } from 'solid-js';
import { supabase } from '../../../config/supabase';
import { authService } from '../../../services/supabase/authService';
import { adminService } from '../../../services/supabase/adminService';
import type { User } from '../../../types/user.types';
import { createServiceLogger } from '../../../utils/logger';

interface AdminProfileProps {
  currentUser: User;
  onUserUpdate: (user: User) => void;
}

interface AdminProfileData {
  displayName: string;
  avatar: string | null;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const logger = createServiceLogger('AdminProfile');

export const AdminProfile: Component<AdminProfileProps> = (props) => {
  const [profileData, setProfileData] = createSignal<AdminProfileData>({
    displayName: props.currentUser.nickname,
    avatar: props.currentUser.avatar || null,
  });
  const [passwordData, setPasswordData] = createSignal<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = createSignal(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = createSignal(false);
  const [isChangingPassword, setIsChangingPassword] = createSignal(false);
  const [message, setMessage] = createSignal<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = createSignal<{ type: 'success' | 'error'; text: string } | null>(null);
  
  let fileInputRef: HTMLInputElement | undefined;

  // Clear messages after 5 seconds
  createEffect(() => {
    const msg = message();
    if (msg) {
      const timer = setTimeout(() => setMessage(null), 5000);
      onCleanup(() => clearTimeout(timer));
    }
  });

  createEffect(() => {
    const msg = passwordMessage();
    if (msg) {
      const timer = setTimeout(() => setPasswordMessage(null), 5000);
      onCleanup(() => clearTimeout(timer));
    }
  });

  const handleProfileUpdate = async (e: Event) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const profile = profileData();
      // Update user profile in database
      const { error } = await supabase
        .from('users')
        .update({
          nickname: profile.displayName,
          avatar: profile.avatar,
        })
        .eq('id', props.currentUser.id);

      if (error) {
        throw new Error(error.message);
      }

      // Log admin action
      await adminService.performUserAction({
        type: 'edit',
        userId: props.currentUser.id,
        adminId: props.currentUser.id,
        reason: 'Admin profile update',
      });

      // Update current user data
      const updatedUser = {
        ...props.currentUser,
        nickname: profile.displayName,
        avatar: profile.avatar,
      };
      props.onUserUpdate(updatedUser);

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      logger.error('Error updating profile:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to update profile' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select a valid image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
      return;
    }

    setIsUploadingAvatar(true);
    setMessage(null);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `admin-avatar-${props.currentUser.id}-${Date.now()}.${fileExt}`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(`admin/${fileName}`, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(`admin/${fileName}`);

      const avatarUrl = urlData.publicUrl;

      // Update profile data
      setProfileData(prev => ({ ...prev, avatar: avatarUrl }));

      setMessage({ type: 'success', text: 'Avatar uploaded successfully!' });
    } catch (error) {
      logger.error('Error uploading avatar:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to upload avatar' 
      });
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      if (fileInputRef) {
        fileInputRef.value = '';
      }
    }
  };

  const handlePasswordChange = async (e: Event) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setPasswordMessage(null);

    const passwords = passwordData();
    // Validate passwords
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      setIsChangingPassword(false);
      return;
    }

    if (passwords.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters long' });
      setIsChangingPassword(false);
      return;
    }

    try {
      // Update password using Supabase auth
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Log admin action
      await adminService.performUserAction({
        type: 'edit',
        userId: props.currentUser.id,
        adminId: props.currentUser.id,
        reason: 'Admin password change',
      });

      // Clear password form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
    } catch (error) {
      logger.error('Error changing password:', error);
      setPasswordMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to change password' 
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef?.click();
  };

  return (
    <div class="space-y-8">
      {/* Profile Information Section */}
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-6">Profile Information</h2>
        
        <form onSubmit={handleProfileUpdate} class="space-y-6">
          {/* Avatar Upload */}
          <div class="flex items-center space-x-6">
            <div class="relative">
              <img
                src={profileData().avatar || '/avatars/default-admin.png'}
                alt="Admin Avatar"
                class="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
              />
              {isUploadingAvatar() && (
                <div class="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={triggerFileInput}
                disabled={isUploadingAvatar()}
                class="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {isUploadingAvatar() ? 'Uploading...' : 'Change Avatar'}
              </button>
              <p class="text-sm text-gray-500 mt-1">
                Upload a new avatar image (max 5MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                class="hidden"
              />
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label for="displayName" class="block text-sm font-medium text-gray-700 mb-2">
              Display Name (appears in chat)
            </label>
            <input
              type="text"
              id="displayName"
              value={profileData().displayName}
              onInput={(e) => setProfileData(prev => ({ ...prev, displayName: e.currentTarget.value }))}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your display name"
              required
              minLength={2}
              maxLength={20}
            />
            <p class="text-sm text-gray-500 mt-1">
              This name will be shown when you appear in the chat
            </p>
          </div>

          {/* Admin Info Display */}
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <div class="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700">
                {props.currentUser.role.charAt(0).toUpperCase() + props.currentUser.role.slice(1)}
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">User ID</label>
              <div class="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 font-mono text-sm">
                {props.currentUser.id}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div class="flex justify-end">
            <button
              type="submit"
              disabled={isLoading()}
              class="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              {isLoading() ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </form>

        {/* Profile Update Message */}
        {message() && (
          <div class={`mt-4 p-3 rounded-md ${
            message()!.type === 'success' 
              ? 'bg-green-100 border border-green-400 text-green-700' 
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            {message()!.text}
          </div>
        )}
      </div>

      {/* Password Change Section */}
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-6">Change Password</h2>
        
        <form onSubmit={handlePasswordChange} class="space-y-4">
          <div>
            <label for="currentPassword" class="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <input
              type="password"
              id="currentPassword"
              value={passwordData().currentPassword}
              onInput={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.currentTarget.value }))}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter current password"
              required
            />
          </div>

          <div>
            <label for="newPassword" class="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              value={passwordData().newPassword}
              onInput={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.currentTarget.value }))}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter new password"
              required
              minLength={6}
            />
            <p class="text-sm text-gray-500 mt-1">
              Password must be at least 6 characters long
            </p>
          </div>

          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={passwordData().confirmPassword}
              onInput={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.currentTarget.value }))}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Confirm new password"
              required
              minLength={6}
            />
          </div>

          <div class="flex justify-end">
            <button
              type="submit"
              disabled={isChangingPassword()}
              class="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              {isChangingPassword() ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>

        {/* Password Change Message */}
        {passwordMessage() && (
          <div class={`mt-4 p-3 rounded-md ${
            passwordMessage()!.type === 'success' 
              ? 'bg-green-100 border border-green-400 text-green-700' 
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            {passwordMessage()!.text}
          </div>
        )}
      </div>

      {/* Admin Preferences Section */}
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-6">Admin Preferences</h2>
        
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-md">
            <div>
              <h3 class="font-medium text-gray-800">Dashboard Theme</h3>
              <p class="text-sm text-gray-600">Choose your preferred dashboard appearance</p>
            </div>
            <select class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>

          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-md">
            <div>
              <h3 class="font-medium text-gray-800">Email Notifications</h3>
              <p class="text-sm text-gray-600">Receive email alerts for important admin events</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" class="sr-only peer" checked />
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-md">
            <div>
              <h3 class="font-medium text-gray-800">Auto-refresh Dashboard</h3>
              <p class="text-sm text-gray-600">Automatically refresh dashboard data every 30 seconds</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" class="sr-only peer" checked />
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};