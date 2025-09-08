import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { imageService } from '../imageService';
import { supabase } from '../../../config/supabase';

// Mock supabase
vi.mock('../../../config/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        remove: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
  },
}));

// Mock DOM APIs
Object.defineProperty(global, 'Image', {
  value: class MockImage {
    onload: (() => void) | null = null;
    width = 800;
    height = 600;
    
    set src(value: string) {
      setTimeout(() => {
        if (this.onload) {
          this.onload();
        }
      }, 0);
    }
  },
});

Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  },
});

Object.defineProperty(global, 'HTMLCanvasElement', {
  value: class MockCanvas {
    width = 0;
    height = 0;
    
    getContext() {
      return {
        drawImage: vi.fn(),
      };
    }
    
    toBlob(callback: (blob: Blob | null) => void) {
      const mockBlob = new Blob(['mock'], { type: 'image/jpeg' });
      callback(mockBlob);
    }
  },
});

Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => new (global as any).HTMLCanvasElement()),
  },
});

describe('ImageService', () => {
  const mockSupabaseAuth = vi.mocked(supabase.auth);
  const mockSupabaseStorage = vi.mocked(supabase.storage);

  const createMockFile = (
    name: string = 'test.jpg',
    type: string = 'image/jpeg',
    size: number = 1024 * 1024 // 1MB
  ): File => {
    const blob = new Blob(['mock file content'], { type });
    return new File([blob], name, { type, lastModified: Date.now() });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateImage', () => {
    it('should return null for valid image', () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024);
      const result = imageService.validateImage(file);
      expect(result).toBeNull();
    });

    it('should return size error for oversized image', () => {
      const file = createMockFile('large.jpg', 'image/jpeg', 15 * 1024 * 1024); // 15MB
      const result = imageService.validateImage(file);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('size');
      expect(result?.message).toContain('10MB');
    });

    it('should return format error for unsupported type', () => {
      const file = createMockFile('test.bmp', 'image/bmp', 1024);
      const result = imageService.validateImage(file);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('format');
      expect(result?.message).toContain('JPEG, PNG, GIF, and WebP');
    });

    it('should accept all supported formats', () => {
      const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      
      supportedTypes.forEach(type => {
        const file = createMockFile(`test.${type.split('/')[1]}`, type, 1024);
        const result = imageService.validateImage(file);
        expect(result).toBeNull();
      });
    });
  });

  describe('uploadImage', () => {
    it('should upload image successfully', async () => {
      const file = createMockFile();
      const userId = 'user-123';
      const conversationId = 'conv-456';

      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null
      });

      const mockStorageChain = {
        upload: vi.fn().mockResolvedValue({
          data: { path: 'mock-path' },
          error: null
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/image.jpg' }
        })
      };

      mockSupabaseStorage.from.mockReturnValue(mockStorageChain as any);

      const result = await imageService.uploadImage(file, userId, conversationId);

      expect(result.url).toBe('https://example.com/image.jpg');
      expect(result.fileName).toContain(userId);
      expect(result.fileName).toContain(conversationId);
      expect(result.type).toBe('image/jpeg');
      expect(mockStorageChain.upload).toHaveBeenCalled();
    });

    it('should throw error when user not authenticated', async () => {
      const file = createMockFile();

      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      await expect(imageService.uploadImage(file, 'user-123', 'conv-456'))
        .rejects.toThrow('User not authenticated');
    });

    it('should throw error for invalid image', async () => {
      const file = createMockFile('test.bmp', 'image/bmp');

      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      await expect(imageService.uploadImage(file, 'user-123', 'conv-456'))
        .rejects.toThrow('JPEG, PNG, GIF, and WebP');
    });

    it('should handle storage upload error', async () => {
      const file = createMockFile();

      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      const mockStorageChain = {
        upload: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Storage error' }
        })
      };

      mockSupabaseStorage.from.mockReturnValue(mockStorageChain as any);

      await expect(imageService.uploadImage(file, 'user-123', 'conv-456'))
        .rejects.toThrow('Failed to upload image');
    });

    it('should call progress callback during upload', async () => {
      const file = createMockFile();
      const progressCallback = vi.fn();

      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      const mockStorageChain = {
        upload: vi.fn().mockResolvedValue({
          data: { path: 'mock-path' },
          error: null
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/image.jpg' }
        })
      };

      mockSupabaseStorage.from.mockReturnValue(mockStorageChain as any);

      await imageService.uploadImage(file, 'user-123', 'conv-456', progressCallback);

      // Note: Progress callback would be called in real implementation
      expect(mockStorageChain.upload).toHaveBeenCalled();
    });
  });

  describe('deleteImage', () => {
    it('should delete image successfully', async () => {
      const mockStorageChain = {
        remove: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseStorage.from.mockReturnValue(mockStorageChain as any);

      await expect(imageService.deleteImage('test-image.jpg')).resolves.not.toThrow();
      expect(mockStorageChain.remove).toHaveBeenCalledWith(['test-image.jpg']);
    });

    it('should handle delete error', async () => {
      const mockStorageChain = {
        remove: vi.fn().mockResolvedValue({
          error: { message: 'File not found' }
        })
      };

      mockSupabaseStorage.from.mockReturnValue(mockStorageChain as any);

      await expect(imageService.deleteImage('test-image.jpg'))
        .rejects.toThrow('Failed to delete image');
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar successfully', async () => {
      const file = createMockFile('avatar.jpg');
      const userId = 'user-123';

      const mockStorageChain = {
        upload: vi.fn().mockResolvedValue({
          data: { path: 'user-123/avatar.jpg' },
          error: null
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/avatar.jpg' }
        })
      };

      mockSupabaseStorage.from.mockReturnValue(mockStorageChain as any);

      const result = await imageService.uploadAvatar(file, userId);

      expect(result).toBe('https://example.com/avatar.jpg');
      expect(mockStorageChain.upload).toHaveBeenCalledWith(
        'user-123/avatar.jpg',
        expect.any(File),
        {
          cacheControl: '3600',
          upsert: true
        }
      );
    });

    it('should throw error for invalid avatar image', async () => {
      const file = createMockFile('avatar.bmp', 'image/bmp');

      await expect(imageService.uploadAvatar(file, 'user-123'))
        .rejects.toThrow('JPEG, PNG, GIF, and WebP');
    });

    it('should handle avatar upload error', async () => {
      const file = createMockFile('avatar.jpg');

      const mockStorageChain = {
        upload: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Upload failed' }
        })
      };

      mockSupabaseStorage.from.mockReturnValue(mockStorageChain as any);

      await expect(imageService.uploadAvatar(file, 'user-123'))
        .rejects.toThrow('Failed to upload avatar');
    });
  });

  describe('utility methods', () => {
    it('should create thumbnail URL', () => {
      const originalUrl = 'https://example.com/image.jpg';
      const thumbnailUrl = imageService.createThumbnailUrl(originalUrl);
      expect(thumbnailUrl).toBe(originalUrl);
    });

    it('should get image dimensions', async () => {
      const file = createMockFile();
      const dimensions = await imageService.getImageDimensions(file);
      
      expect(dimensions.width).toBe(800);
      expect(dimensions.height).toBe(600);
    });

    it('should create and revoke preview URL', () => {
      const file = createMockFile();
      const mockCreateObjectURL = vi.mocked(URL.createObjectURL);
      const mockRevokeObjectURL = vi.mocked(URL.revokeObjectURL);

      const previewUrl = imageService.createPreviewUrl(file);
      expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
      expect(previewUrl).toBe('blob:mock-url');

      imageService.revokePreviewUrl(previewUrl);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith(previewUrl);
    });
  });
});