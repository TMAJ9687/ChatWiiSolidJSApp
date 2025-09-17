import { supabase } from "../../config/supabase";
import { createServiceLogger } from "../../utils/logger";

const logger = createServiceLogger('ImageService');

interface ImageUploadResult {
  url: string;
  fileName: string;
  size: number;
  type: string;
}

interface ImageValidationError {
  type: 'size' | 'format' | 'dimensions';
  message: string;
}

class ImageService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  private readonly MAX_DIMENSION = 2048; // Max width/height

  // Validate image file
  validateImage(file: File): ImageValidationError | null {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        type: 'size',
        message: `Image size must be less than ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
      };
    }

    // Check file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        type: 'format',
        message: 'Only JPEG, PNG, GIF, and WebP images are allowed'
      };
    }

    return null;
  }

  // Compress image if needed
  private async compressImage(file: File): Promise<File> {
    // Skip compression for GIFs to preserve animation
    if (file.type === 'image/gif') {
      return file;
    }

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        // Calculate new dimensions if image is too large
        if (width > this.MAX_DIMENSION || height > this.MAX_DIMENSION) {
          const ratio = Math.min(this.MAX_DIMENSION / width, this.MAX_DIMENSION / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, file.type, 0.8); // 80% quality
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // Upload image to Supabase Storage
  async uploadImage(
    file: File, 
    userId: string, 
    conversationId: string,
    onProgress?: (progress: number) => void
  ): Promise<ImageUploadResult> {
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Validate image
    const validationError = this.validateImage(file);
    if (validationError) {
      throw new Error(validationError.message);
    }

    try {
      // Compress image if needed
      const processedFile = await this.compressImage(file);

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileExt = processedFile.type.split('/')[1];
      const fileName = `${userId}_${conversationId}_${timestamp}_${randomId}.${fileExt}`;
      const filePath = fileName;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('chat-images')
        .upload(filePath, processedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('chat-images')
        .getPublicUrl(filePath);

      return {
        url: publicUrlData.publicUrl,
        fileName: fileName,
        size: processedFile.size,
        type: processedFile.type
      };
    } catch (error) {
      logger.error('Error uploading image:', error);
      throw new Error('Failed to upload image. Please try again.');
    }
  }

  // Delete image from storage
  async deleteImage(fileName: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from('chat-images')
        .remove([fileName]);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Error deleting image:', error);
      throw new Error('Failed to delete image');
    }
  }

  // Create thumbnail URL (for optimization)
  createThumbnailUrl(originalUrl: string): string {
    // In a real app, you might use a service like Cloudinary or Supabase Image Transformations
    // For now, we'll use the original URL
    return originalUrl;
  }

  // Get image dimensions
  async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.src = URL.createObjectURL(file);
    });
  }

  // Create image preview URL
  createPreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  // Cleanup preview URL
  revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  // Upload avatar image
  async uploadAvatar(file: File, userId: string): Promise<string> {
    // Validate image
    const validationError = this.validateImage(file);
    if (validationError) {
      throw new Error(validationError.message);
    }

    try {
      // Compress image
      const processedFile = await this.compressImage(file);

      // Generate filename
      const fileExt = processedFile.type.split('/')[1];
      const fileName = `avatar.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Upload to avatars bucket
      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, processedFile, {
          cacheControl: '3600',
          upsert: true // Allow overwriting existing avatar
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error) {
      logger.error('Error uploading avatar:', error);
      throw new Error('Failed to upload avatar. Please try again.');
    }
  }
}

export const imageService = new ImageService();
export type { ImageUploadResult, ImageValidationError };