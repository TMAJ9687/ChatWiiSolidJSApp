import { imagekitConfig, getImageKitTransformationUrl } from "../../config/imagekit";
import { createServiceLogger } from "../../utils/logger";

const logger = createServiceLogger('ImageKitService');

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

class ImageKitService {
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

  // Upload image to ImageKit
  async uploadImage(
    file: File,
    userId: string,
    conversationId: string,
    onProgress?: (progress: number) => void
  ): Promise<ImageUploadResult> {
    if (!imagekitConfig.isConfigured) {
      throw new Error('ImageKit is not configured. Please check your environment variables.');
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
      const fileName = `chat-images/${userId}_${conversationId}_${timestamp}_${randomId}.${fileExt}`;

      // Upload to ImageKit using direct upload
      const uploadResponse = await this.uploadToImageKit(processedFile, fileName, onProgress);

      return {
        url: uploadResponse.url,
        fileName: fileName,
        size: processedFile.size,
        type: processedFile.type
      };
    } catch (error) {
      logger.error('Error uploading image to ImageKit:', error);
      throw new Error('Failed to upload image. Please try again.');
    }
  }

  // Get authentication parameters from our Cloudflare Worker
  private async getAuthenticationParameters(): Promise<{
    token: string;
    expire: number;
    signature: string;
  }> {
    try {
      // Use your Cloudflare Pages domain
      const authEndpoint = 'https://chatwiisolidjsapp.pages.dev/api/imagekit-auth';
      const response = await fetch(authEndpoint);

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Failed to get ImageKit authentication:', error);
      throw new Error('Failed to authenticate with ImageKit');
    }
  }

  // Upload to ImageKit using authenticated API
  private async uploadToImageKit(
    file: File,
    fileName: string,
    onProgress?: (progress: number) => void
  ): Promise<{ url: string; fileId: string }> {
    // Get authentication parameters
    const authParams = await this.getAuthenticationParameters();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', fileName);
    formData.append('publicKey', imagekitConfig.publicKey);
    formData.append('token', authParams.token);
    formData.append('expire', authParams.expire.toString());
    formData.append('signature', authParams.signature);

    // Additional upload parameters
    formData.append('useUniqueFileName', 'true');
    formData.append('tags', 'chatwii,chat-image');

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        });
      }

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              url: response.url,
              fileId: response.fileId
            });
          } catch (error) {
            reject(new Error('Invalid response from ImageKit'));
          }
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during upload'));
      };

      xhr.open('POST', 'https://upload.imagekit.io/api/v1/files/upload');
      xhr.send(formData);
    });
  }

  // Delete image from ImageKit
  async deleteImage(fileName: string): Promise<void> {
    try {
      // Note: Direct deletion requires server-side implementation
      // For now, we'll just log the deletion request
      logger.info('Image deletion requested:', fileName);

      // In a real implementation, you would:
      // 1. Extract fileId from the URL or store it when uploading
      // 2. Call ImageKit's delete API from your backend
      // 3. For client-side, you might need to call your own API endpoint

      console.warn('Image deletion not implemented - requires server-side API');
    } catch (error) {
      logger.error('Error deleting image:', error);
      throw new Error('Failed to delete image');
    }
  }

  // Create optimized URL with ImageKit transformations
  createOptimizedUrl(originalUrl: string, options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  }): string {
    // Return original URL if it's empty, invalid, or contains placeholder patterns
    if (!originalUrl ||
        !originalUrl.includes('ik.imagekit.io') ||
        originalUrl.includes('text=') ||
        originalUrl.includes('600x400')) {
      return originalUrl;
    }

    let transformations: string[] = [];

    if (options?.width) {
      transformations.push(`w-${options.width}`);
    }
    if (options?.height) {
      transformations.push(`h-${options.height}`);
    }
    if (options?.quality) {
      transformations.push(`q-${options.quality}`);
    }
    if (options?.format) {
      transformations.push(`f-${options.format}`);
    }

    if (transformations.length === 0) {
      return originalUrl;
    }

    return getImageKitTransformationUrl(originalUrl, transformations.join(','));
  }

  // Create thumbnail URL
  createThumbnailUrl(originalUrl: string): string {
    return this.createOptimizedUrl(originalUrl, {
      width: 200,
      height: 200,
      quality: 80
    });
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

      // Generate filename for avatar
      const fileExt = processedFile.type.split('/')[1];
      const fileName = `avatars/${userId}/avatar.${fileExt}`;

      // Upload to ImageKit
      const uploadResponse = await this.uploadToImageKit(processedFile, fileName);

      return uploadResponse.url;
    } catch (error) {
      logger.error('Error uploading avatar to ImageKit:', error);
      throw new Error('Failed to upload avatar. Please try again.');
    }
  }
}

export const imagekitService = new ImageKitService();
export type { ImageUploadResult, ImageValidationError };