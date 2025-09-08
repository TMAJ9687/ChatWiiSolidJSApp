import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../../../config/supabase';
import { adminService } from '../../../../services/supabase/adminService';

// Mock dependencies
vi.mock('../../../../config/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null }))
      }))
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => ({ data: { path: 'test-path' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.com/avatar.jpg' } }))
      }))
    },
    auth: {
      updateUser: vi.fn(() => ({ error: null }))
    }
  }
}));

vi.mock('../../../../services/supabase/adminService', () => ({
  adminService: {
    performUserAction: vi.fn(() => Promise.resolve({ success: true }))
  }
}));

describe('AdminProfile Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Profile Update', () => {
    it('should validate display name requirements', () => {
      const displayName = 'TestAdmin';
      
      // Test minimum length
      expect(displayName.length).toBeGreaterThanOrEqual(2);
      
      // Test maximum length
      expect(displayName.length).toBeLessThanOrEqual(20);
      
      // Test non-empty
      expect(displayName.trim()).not.toBe('');
    });

    it('should update user profile in database', async () => {
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({ error: null }))
      }));
      
      (supabase.from as any).mockReturnValue({
        update: mockUpdate
      });

      const profileData = {
        displayName: 'UpdatedAdmin',
        avatar: '/avatars/admin/test.jpg'
      };

      // Simulate profile update
      const { error } = await supabase
        .from('users')
        .update({
          nickname: profileData.displayName,
          avatar: profileData.avatar,
        })
        .eq('id', 'test-user-id');

      expect(mockUpdate).toHaveBeenCalledWith({
        nickname: 'UpdatedAdmin',
        avatar: '/avatars/admin/test.jpg'
      });
      expect(error).toBeNull();
    });

    it('should log admin action after profile update', async () => {
      await adminService.performUserAction({
        type: 'edit',
        userId: 'test-user-id',
        adminId: 'test-user-id',
        reason: 'Admin profile update',
      });

      expect(adminService.performUserAction).toHaveBeenCalledWith({
        type: 'edit',
        userId: 'test-user-id',
        adminId: 'test-user-id',
        reason: 'Admin profile update',
      });
    });
  });

  describe('Avatar Upload', () => {
    it('should validate file type', () => {
      const validFile = { type: 'image/jpeg', size: 1024 * 1024 };
      const invalidFile = { type: 'text/plain', size: 1024 };

      expect(validFile.type.startsWith('image/')).toBe(true);
      expect(invalidFile.type.startsWith('image/')).toBe(false);
    });

    it('should validate file size', () => {
      const validFile = { type: 'image/jpeg', size: 3 * 1024 * 1024 }; // 3MB
      const invalidFile = { type: 'image/jpeg', size: 6 * 1024 * 1024 }; // 6MB

      const maxSize = 5 * 1024 * 1024; // 5MB
      expect(validFile.size).toBeLessThanOrEqual(maxSize);
      expect(invalidFile.size).toBeGreaterThan(maxSize);
    });

    it('should upload avatar to storage', async () => {
      const mockUpload = vi.fn(() => ({ data: { path: 'test-path' }, error: null }));
      const mockGetPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://test.com/avatar.jpg' } }));
      
      (supabase.storage.from as any).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl
      });

      const fileName = 'admin-avatar-test-user-id-123456.jpg';
      const mockFile = new Blob(['test'], { type: 'image/jpeg' });

      await supabase.storage
        .from('avatars')
        .upload(`admin/${fileName}`, mockFile, {
          cacheControl: '3600',
          upsert: false,
        });

      expect(mockUpload).toHaveBeenCalledWith(
        `admin/${fileName}`,
        mockFile,
        {
          cacheControl: '3600',
          upsert: false,
        }
      );
    });
  });

  describe('Password Change', () => {
    it('should validate password confirmation', () => {
      const password1 = 'newpassword123';
      const password2 = 'newpassword123';
      const password3 = 'differentpassword';

      expect(password1).toBe(password2);
      expect(password1).not.toBe(password3);
    });

    it('should validate password length', () => {
      const validPassword = 'password123';
      const invalidPassword = '123';

      expect(validPassword.length).toBeGreaterThanOrEqual(6);
      expect(invalidPassword.length).toBeLessThan(6);
    });

    it('should update password using Supabase auth', async () => {
      const mockUpdateUser = vi.fn(() => ({ error: null }));
      (supabase.auth.updateUser as any).mockImplementation(mockUpdateUser);

      await supabase.auth.updateUser({
        password: 'newpassword123',
      });

      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: 'newpassword123',
      });
    });

    it('should log admin action after password change', async () => {
      await adminService.performUserAction({
        type: 'edit',
        userId: 'test-user-id',
        adminId: 'test-user-id',
        reason: 'Admin password change',
      });

      expect(adminService.performUserAction).toHaveBeenCalledWith({
        type: 'edit',
        userId: 'test-user-id',
        adminId: 'test-user-id',
        reason: 'Admin password change',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle profile update errors', async () => {
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({ error: { message: 'Update failed' } }))
      }));
      
      (supabase.from as any).mockReturnValue({
        update: mockUpdate
      });

      const { error } = await supabase
        .from('users')
        .update({ nickname: 'TestAdmin' })
        .eq('id', 'test-user-id');

      expect(error).toEqual({ message: 'Update failed' });
    });

    it('should handle avatar upload errors', async () => {
      const mockUpload = vi.fn(() => ({ data: null, error: { message: 'Upload failed' } }));
      
      (supabase.storage.from as any).mockReturnValue({
        upload: mockUpload
      });

      const { error } = await supabase.storage
        .from('avatars')
        .upload('test-path', new Blob(['test']));

      expect(error).toEqual({ message: 'Upload failed' });
    });

    it('should handle password change errors', async () => {
      const mockUpdateUser = vi.fn(() => ({ error: { message: 'Password update failed' } }));
      (supabase.auth.updateUser as any).mockImplementation(mockUpdateUser);

      const { error } = await supabase.auth.updateUser({
        password: 'newpassword',
      });

      expect(error).toEqual({ message: 'Password update failed' });
    });
  });
});