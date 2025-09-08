import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { avatarService } from '../avatarService';
import { supabase } from '../../../config/supabase';
import type { Avatar, AvatarUploadRequest } from '../avatarService';

// Mock supabase
vi.mock('../../../config/supabase', () => ({
  supabase: {
    from: vi.fn(() => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      };
      // Make all methods return resolved promises by default
      Object.keys(mockChain).forEach(key => {
        if (key !== 'mockReturnThis') {
          const originalMethod = mockChain[key as keyof typeof mockChain];
          if (typeof originalMethod === 'function' && key !== 'single') {
            mockChain[key as keyof typeof mockChain] = vi.fn().mockReturnValue(mockChain);
          }
        }
      });
      return mockChain;
    }),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({
          data: { path: 'test-path' },
          error: null
        }),
        remove: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/avatar.jpg' }
        })
      }))
    }
  },
}));

describe('AvatarService', () => {
  const mockSupabaseFrom = vi.mocked(supabase.from);
  const mockSupabaseStorage = vi.mocked(supabase.storage);
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('uploadAvatar', () => {
    const createMockFile = (name: string, size: number, type: string): File => {
      const file = new File(['test content'], name, { type });
      Object.defineProperty(file, 'size', { value: size });
      return file;
    };

    const validUploadRequest: AvatarUploadRequest = {
      file: createMockFile('avatar.jpg', 1024 * 1024, 'image/jpeg'), // 1MB
      type: 'standard',
      gender: 'male',
      isDefault: false
    };

    it('should successfully upload an avatar', async () => {
      const mockInsertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'avatar-123',
            url: 'https://example.com/avatar.jpg',
            type: 'standard',
            gender: 'male',
            is_default: false,
            uploaded_by: 'admin-123',
            created_at: '2024-01-01T12:00:00Z'
          },
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockInsertChain as any);

      const result = await avatarService.uploadAvatar(validUploadRequest, 'admin-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Avatar uploaded successfully for standard male');
      expect(result.data).toHaveProperty('id', 'avatar-123');
      expect(mockInsertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://example.com/avatar.jpg',
          type: 'standard',
          gender: 'male',
          is_default: false,
          uploaded_by: 'admin-123'
        })
      );
    });

    it('should reject files that are too large', async () => {
      const largeFileRequest: AvatarUploadRequest = {
        ...validUploadRequest,
        file: createMockFile('large.jpg', 10 * 1024 * 1024, 'image/jpeg') // 10MB
      };

      const result = await avatarService.uploadAvatar(largeFileRequest, 'admin-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('File size must be less than 5MB');
    });

    it('should reject invalid file types', async () => {
      const invalidTypeRequest: AvatarUploadRequest = {
        ...validUploadRequest,
        file: createMockFile('document.pdf', 1024, 'application/pdf')
      };

      const result = await avatarService.uploadAvatar(invalidTypeRequest, 'admin-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('File must be an image (JPEG, PNG, GIF, or WebP)');
    });

    it('should handle storage upload errors', async () => {
      const mockStorageFrom = vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Storage error' }
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/avatar.jpg' }
        })
      }));

      mockSupabaseStorage.from = mockStorageFrom;

      const result = await avatarService.uploadAvatar(validUploadRequest, 'admin-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Storage error');
    });

    it('should handle database insert errors', async () => {
      const mockInsertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      };

      mockSupabaseFrom.mockReturnValue(mockInsertChain as any);

      const result = await avatarService.uploadAvatar(validUploadRequest, 'admin-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Database error');
    });

    it('should set as default and unset other defaults', async () => {
      const defaultUploadRequest: AvatarUploadRequest = {
        ...validUploadRequest,
        isDefault: true
      };

      const mockInsertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'avatar-123',
            url: 'https://example.com/avatar.jpg',
            type: 'standard',
            gender: 'male',
            is_default: true,
            uploaded_by: 'admin-123',
            created_at: '2024-01-01T12:00:00Z'
          },
          error: null
        })
      };

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockInsertChain as any) // Insert avatar
        .mockReturnValueOnce(mockUpdateChain as any); // Unset other defaults

      const result = await avatarService.uploadAvatar(defaultUploadRequest, 'admin-123');

      expect(result.success).toBe(true);
      expect(mockUpdateChain.update).toHaveBeenCalledWith({ is_default: false });
    });
  });

  describe('deleteAvatar', () => {
    it('should successfully delete an avatar', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'avatar-123',
            url: 'https://example.com/avatars/standard/male/avatar.jpg',
            type: 'standard',
            gender: 'male'
          },
          error: null
        })
      };

      const mockDeleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockSelectChain as any) // Get avatar
        .mockReturnValueOnce(mockDeleteChain as any); // Delete avatar

      const result = await avatarService.deleteAvatar('avatar-123', 'admin-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Avatar deleted successfully');
      expect(result.data).toEqual({
        avatarId: 'avatar-123',
        url: 'https://example.com/avatars/standard/male/avatar.jpg'
      });
    });

    it('should handle non-existent avatar', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await avatarService.deleteAvatar('non-existent');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Avatar not found');
    });

    it('should handle database deletion errors', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'avatar-123',
            url: 'https://example.com/avatar.jpg'
          },
          error: null
        })
      };

      const mockDeleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'Database error' } })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockSelectChain as any)
        .mockReturnValueOnce(mockDeleteChain as any);

      const result = await avatarService.deleteAvatar('avatar-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Database error');
    });
  });

  describe('getAvatarCollection', () => {
    it('should return organized avatar collection', async () => {
      const mockAvatars = [
        {
          id: 'avatar-1',
          url: 'https://example.com/avatar1.jpg',
          type: 'standard',
          gender: 'male',
          is_default: false,
          uploaded_by: 'admin-123',
          created_at: '2024-01-01T12:00:00Z'
        },
        {
          id: 'avatar-2',
          url: 'https://example.com/avatar2.jpg',
          type: 'vip',
          gender: 'female',
          is_default: true,
          uploaded_by: 'admin-123',
          created_at: '2024-01-01T13:00:00Z'
        }
      ];

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockAvatars,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await avatarService.getAvatarCollection();

      expect(result.standard.male).toContain('https://example.com/avatar1.jpg');
      expect(result.vip.female).toContain('https://example.com/avatar2.jpg');
      expect(result.standard.female).toEqual([]);
      expect(result.vip.male).toEqual([]);
    });

    it('should return empty collection on database error', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await avatarService.getAvatarCollection();

      expect(result).toEqual({
        standard: { male: [], female: [] },
        vip: { male: [], female: [] }
      });
    });
  });

  describe('getAvatars', () => {
    it('should return filtered avatars by type and gender', async () => {
      const mockAvatars = [
        {
          id: 'avatar-1',
          url: 'https://example.com/avatar1.jpg',
          type: 'standard',
          gender: 'male',
          is_default: false,
          uploaded_by: 'admin-123',
          created_at: '2024-01-01T12:00:00Z'
        }
      ];

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockAvatars,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await avatarService.getAvatars('standard', 'male');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('standard');
      expect(result[0].gender).toBe('male');
      expect(mockSelectChain.eq).toHaveBeenCalledWith('type', 'standard');
      expect(mockSelectChain.eq).toHaveBeenCalledWith('gender', 'male');
    });

    it('should return all avatars when no filters provided', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await avatarService.getAvatars();

      expect(result).toEqual([]);
      expect(mockSelectChain.eq).not.toHaveBeenCalled();
    });
  });

  describe('setDefaultAvatar', () => {
    it('should set avatar as default and unset others', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'avatar-123',
            type: 'standard',
            gender: 'male'
          },
          error: null
        })
      };

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockSelectChain as any) // Get avatar
        .mockReturnValueOnce(mockUpdateChain as any) // Unset others
        .mockReturnValueOnce(mockUpdateChain as any); // Set default

      const result = await avatarService.setDefaultAvatar('avatar-123', 'admin-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Default avatar set for standard male');
      expect(mockUpdateChain.update).toHaveBeenCalledWith({ is_default: false });
      expect(mockUpdateChain.update).toHaveBeenCalledWith({ is_default: true });
    });

    it('should handle non-existent avatar', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await avatarService.setDefaultAvatar('non-existent');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Avatar not found');
    });
  });

  describe('getDefaultAvatar', () => {
    it('should return default avatar for type and gender', async () => {
      const mockAvatar = {
        id: 'avatar-123',
        url: 'https://example.com/default.jpg',
        type: 'standard',
        gender: 'male',
        is_default: true,
        uploaded_by: 'admin-123',
        created_at: '2024-01-01T12:00:00Z'
      };

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockAvatar,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await avatarService.getDefaultAvatar('standard', 'male');

      expect(result).not.toBeNull();
      expect(result?.isDefault).toBe(true);
      expect(result?.type).toBe('standard');
      expect(result?.gender).toBe('male');
    });

    it('should return null when no default avatar exists', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await avatarService.getDefaultAvatar('vip', 'female');

      expect(result).toBeNull();
    });
  });

  describe('assignDefaultAvatarToUser', () => {
    it('should assign default avatar to user', async () => {
      // Mock getDefaultAvatar
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'avatar-123',
            url: 'https://example.com/default.jpg',
            type: 'standard',
            gender: 'male',
            is_default: true
          },
          error: null
        })
      };

      // Mock user update
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockSelectChain as any) // Get default avatar
        .mockReturnValueOnce(mockUpdateChain as any); // Update user

      const result = await avatarService.assignDefaultAvatarToUser('user-123', 'standard', 'male');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Default avatar assigned to user');
      expect(result.data).toEqual({
        userId: 'user-123',
        avatarUrl: 'https://example.com/default.jpg'
      });
    });

    it('should handle missing default avatar', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await avatarService.assignDefaultAvatarToUser('user-123', 'vip', 'female');

      expect(result.success).toBe(false);
      expect(result.message).toBe('No default avatar found for vip female');
    });
  });

  describe('getAvatarStatistics', () => {
    it('should return avatar statistics', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      };

      // Mock all count queries to return 5
      mockSelectChain.select.mockResolvedValue({ count: 5, error: null });

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await avatarService.getAvatarStatistics();

      expect(result.totalAvatars).toBe(5);
      expect(result.standardAvatars).toBe(5);
      expect(result.vipAvatars).toBe(5);
      expect(result.maleAvatars).toBe(5);
      expect(result.femaleAvatars).toBe(5);
      expect(result.defaultAvatars).toBe(5);
    });

    it('should handle database errors gracefully', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      };

      mockSelectChain.select.mockResolvedValue({ count: null, error: { message: 'Database error' } });

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await avatarService.getAvatarStatistics();

      expect(result).toEqual({
        totalAvatars: 0,
        standardAvatars: 0,
        vipAvatars: 0,
        maleAvatars: 0,
        femaleAvatars: 0,
        defaultAvatars: 0
      });
    });
  });

  describe('uploadAdminAvatar', () => {
    const createMockFile = (name: string, size: number, type: string): File => {
      const file = new File(['test content'], name, { type });
      Object.defineProperty(file, 'size', { value: size });
      return file;
    };

    it('should upload admin avatar and update user', async () => {
      const mockFile = createMockFile('admin-avatar.jpg', 1024 * 1024, 'image/jpeg');

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom.mockReturnValue(mockUpdateChain as any);

      const result = await avatarService.uploadAdminAvatar(mockFile, 'admin-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Admin avatar uploaded successfully');
      expect(result.data).toEqual({
        adminId: 'admin-123',
        avatarUrl: 'https://example.com/avatar.jpg'
      });
      expect(mockUpdateChain.update).toHaveBeenCalledWith({
        avatar: 'https://example.com/avatar.jpg'
      });
    });

    it('should validate admin avatar file', async () => {
      const invalidFile = createMockFile('document.pdf', 1024, 'application/pdf');

      const result = await avatarService.uploadAdminAvatar(invalidFile, 'admin-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('File must be an image (JPEG, PNG, GIF, or WebP)');
    });
  });
});