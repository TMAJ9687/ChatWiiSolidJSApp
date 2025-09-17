import { supabase } from "../../config/supabase";
import type { AdminActionResult } from "../../types/admin.types";
import { createServiceLogger } from "../../utils/logger";

const logger = createServiceLogger('AvatarService');

export interface AvatarCollection {
  standard: {
    male: string[];
    female: string[];
  };
  vip: {
    male: string[];
    female: string[];
  };
}

export interface Avatar {
  id: string;
  url: string;
  type: 'standard' | 'vip';
  gender: 'male' | 'female';
  isDefault: boolean;
  uploadedBy?: string;
  createdAt: string;
}

export interface AvatarUploadRequest {
  file: File;
  type: 'standard' | 'vip';
  gender: 'male' | 'female';
  isDefault?: boolean;
}

class AvatarService {
  private readonly AVATAR_BUCKET = 'avatars';
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  // Upload a new avatar
  async uploadAvatar(
    uploadRequest: AvatarUploadRequest,
    adminId: string
  ): Promise<AdminActionResult> {
    try {
      // Validate file
      const validation = this.validateFile(uploadRequest.file);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.message
        };
      }

      // Generate unique filename
      const fileExtension = uploadRequest.file.name.split('.').pop();
      const fileName = `${uploadRequest.type}/${uploadRequest.gender}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.AVATAR_BUCKET)
        .upload(fileName, uploadRequest.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.AVATAR_BUCKET)
        .getPublicUrl(fileName);

      const avatarUrl = urlData.publicUrl;

      // Save avatar metadata to database
      const { data: avatarData, error: dbError } = await supabase
        .from("avatars")
        .insert({
          url: avatarUrl,
          type: uploadRequest.type,
          gender: uploadRequest.gender,
          is_default: uploadRequest.isDefault || false,
          uploaded_by: adminId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (dbError) {
        // Cleanup uploaded file if database insert fails
        await this.deleteFileFromStorage(fileName);
        throw new Error(dbError.message);
      }

      // If this is set as default, unset other defaults
      if (uploadRequest.isDefault) {
        await this.unsetOtherDefaults(uploadRequest.type, uploadRequest.gender, avatarData.id);
      }

      return {
        success: true,
        message: `Avatar uploaded successfully for ${uploadRequest.type} ${uploadRequest.gender}`,
        data: this.convertToAvatar(avatarData)
      };
    } catch (error) {
      logger.error("Error uploading avatar:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to upload avatar'
      };
    }
  }

  // Delete an avatar
  async deleteAvatar(avatarId: string, adminId?: string): Promise<AdminActionResult> {
    try {
      // Get avatar details
      const { data: avatarData, error: fetchError } = await supabase
        .from("avatars")
        .select("*")
        .eq("id", avatarId)
        .single();

      if (fetchError || !avatarData) {
        return {
          success: false,
          message: 'Avatar not found'
        };
      }

      // Extract filename from URL
      const fileName = this.extractFileNameFromUrl(avatarData.url);

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(this.AVATAR_BUCKET)
        .remove([fileName]);

      if (storageError) {
        logger.warn("Error deleting file from storage:", storageError);
        // Continue with database deletion even if storage deletion fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("avatars")
        .delete()
        .eq("id", avatarId);

      if (dbError) {
        throw new Error(dbError.message);
      }

      return {
        success: true,
        message: `Avatar deleted successfully`,
        data: { avatarId, url: avatarData.url }
      };
    } catch (error) {
      logger.error("Error deleting avatar:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete avatar'
      };
    }
  }

  // Get avatar collection
  async getAvatarCollection(): Promise<AvatarCollection> {
    try {
      const { data, error } = await supabase
        .from("avatars")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        logger.error("Error getting avatar collection:", error);
        return this.getEmptyCollection();
      }

      const collection: AvatarCollection = this.getEmptyCollection();

      if (data) {
        for (const avatar of data) {
          const avatarObj = this.convertToAvatar(avatar);
          collection[avatarObj.type][avatarObj.gender].push(avatarObj.url);
        }
      }

      return collection;
    } catch (error) {
      logger.error("Error getting avatar collection:", error);
      return this.getEmptyCollection();
    }
  }

  // Get avatars by type and gender
  async getAvatars(
    type?: 'standard' | 'vip',
    gender?: 'male' | 'female'
  ): Promise<Avatar[]> {
    try {
      let query = supabase
        .from("avatars")
        .select("*")
        .order("created_at", { ascending: true });

      if (type) {
        query = query.eq("type", type);
      }

      if (gender) {
        query = query.eq("gender", gender);
      }

      const { data, error } = await query;

      if (error) {
        logger.error("Error getting avatars:", error);
        return [];
      }

      return (data || []).map(this.convertToAvatar);
    } catch (error) {
      logger.error("Error getting avatars:", error);
      return [];
    }
  }

  // Set default avatar
  async setDefaultAvatar(
    avatarId: string,
    adminId?: string
  ): Promise<AdminActionResult> {
    try {
      // Get avatar details
      const { data: avatarData, error: fetchError } = await supabase
        .from("avatars")
        .select("*")
        .eq("id", avatarId)
        .single();

      if (fetchError || !avatarData) {
        return {
          success: false,
          message: 'Avatar not found'
        };
      }

      // Unset other defaults for this type and gender
      await this.unsetOtherDefaults(avatarData.type, avatarData.gender, avatarId);

      // Set this avatar as default
      const { error: updateError } = await supabase
        .from("avatars")
        .update({ is_default: true })
        .eq("id", avatarId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      return {
        success: true,
        message: `Default avatar set for ${avatarData.type} ${avatarData.gender}`,
        data: { avatarId, type: avatarData.type, gender: avatarData.gender }
      };
    } catch (error) {
      logger.error("Error setting default avatar:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to set default avatar'
      };
    }
  }

  // Get default avatar for type and gender
  async getDefaultAvatar(
    type: 'standard' | 'vip',
    gender: 'male' | 'female'
  ): Promise<Avatar | null> {
    try {
      const { data, error } = await supabase
        .from("avatars")
        .select("*")
        .eq("type", type)
        .eq("gender", gender)
        .eq("is_default", true)
        .single();

      if (error || !data) {
        return null;
      }

      return this.convertToAvatar(data);
    } catch (error) {
      logger.error("Error getting default avatar:", error);
      return null;
    }
  }

  // Assign default avatar to new user
  async assignDefaultAvatarToUser(
    userId: string,
    userType: 'standard' | 'vip',
    gender: 'male' | 'female'
  ): Promise<AdminActionResult> {
    try {
      const defaultAvatar = await this.getDefaultAvatar(userType, gender);
      
      if (!defaultAvatar) {
        return {
          success: false,
          message: `No default avatar found for ${userType} ${gender}`
        };
      }

      // Update user's avatar
      const { error } = await supabase
        .from("users")
        .update({ avatar: defaultAvatar.url })
        .eq("id", userId);

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        message: 'Default avatar assigned to user',
        data: { userId, avatarUrl: defaultAvatar.url }
      };
    } catch (error) {
      logger.error("Error assigning default avatar to user:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to assign default avatar'
      };
    }
  }

  // Get avatar statistics
  async getAvatarStatistics(): Promise<{
    totalAvatars: number;
    standardAvatars: number;
    vipAvatars: number;
    maleAvatars: number;
    femaleAvatars: number;
    defaultAvatars: number;
  }> {
    try {
      const [totalResult, standardResult, vipResult, maleResult, femaleResult, defaultResult] = await Promise.all([
        supabase.from("avatars").select("*", { count: "exact", head: true }),
        supabase.from("avatars").select("*", { count: "exact", head: true }).eq("type", "standard"),
        supabase.from("avatars").select("*", { count: "exact", head: true }).eq("type", "vip"),
        supabase.from("avatars").select("*", { count: "exact", head: true }).eq("gender", "male"),
        supabase.from("avatars").select("*", { count: "exact", head: true }).eq("gender", "female"),
        supabase.from("avatars").select("*", { count: "exact", head: true }).eq("is_default", true)
      ]);

      return {
        totalAvatars: totalResult.count || 0,
        standardAvatars: standardResult.count || 0,
        vipAvatars: vipResult.count || 0,
        maleAvatars: maleResult.count || 0,
        femaleAvatars: femaleResult.count || 0,
        defaultAvatars: defaultResult.count || 0
      };
    } catch (error) {
      logger.error("Error getting avatar statistics:", error);
      return {
        totalAvatars: 0,
        standardAvatars: 0,
        vipAvatars: 0,
        maleAvatars: 0,
        femaleAvatars: 0,
        defaultAvatars: 0
      };
    }
  }

  // Bulk upload avatars
  async bulkUploadAvatars(
    files: File[],
    type: 'standard' | 'vip',
    gender: 'male' | 'female',
    adminId: string
  ): Promise<AdminActionResult[]> {
    const results: AdminActionResult[] = [];

    for (const file of files) {
      const uploadRequest: AvatarUploadRequest = {
        file,
        type,
        gender,
        isDefault: false
      };

      const result = await this.uploadAvatar(uploadRequest, adminId);
      results.push(result);
    }

    return results;
  }

  // Clear all avatars of a specific type and gender
  async clearAvatars(
    type: 'standard' | 'vip',
    gender: 'male' | 'female',
    adminId?: string
  ): Promise<AdminActionResult> {
    try {
      // Get all avatars to delete
      const avatars = await this.getAvatars(type, gender);

      if (avatars.length === 0) {
        return {
          success: true,
          message: `No ${type} ${gender} avatars to clear`
        };
      }

      // Delete each avatar
      let successCount = 0;
      let failureCount = 0;

      for (const avatar of avatars) {
        const result = await this.deleteAvatar(avatar.id, adminId);
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      }

      return {
        success: successCount > 0,
        message: `Cleared ${successCount} ${type} ${gender} avatars${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
        data: { successCount, failureCount, total: avatars.length }
      };
    } catch (error) {
      logger.error("Error clearing avatars:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to clear avatars'
      };
    }
  }

  // Private helper methods
  private validateFile(file: File): { isValid: boolean; message: string } {
    if (!file) {
      return { isValid: false, message: 'No file provided' };
    }

    if (file.size > this.MAX_FILE_SIZE) {
      return { isValid: false, message: 'File size must be less than 5MB' };
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return { isValid: false, message: 'File must be an image (JPEG, PNG, GIF, or WebP)' };
    }

    return { isValid: true, message: '' };
  }

  private async unsetOtherDefaults(
    type: 'standard' | 'vip',
    gender: 'male' | 'female',
    excludeId: string
  ): Promise<void> {
    try {
      await supabase
        .from("avatars")
        .update({ is_default: false })
        .eq("type", type)
        .eq("gender", gender)
        .neq("id", excludeId);
    } catch (error) {
      logger.error("Error unsetting other defaults:", error);
    }
  }

  private async deleteFileFromStorage(fileName: string): Promise<void> {
    try {
      await supabase.storage
        .from(this.AVATAR_BUCKET)
        .remove([fileName]);
    } catch (error) {
      logger.error("Error deleting file from storage:", error);
    }
  }

  private extractFileNameFromUrl(url: string): string {
    // Extract filename from Supabase storage URL
    const urlParts = url.split('/');
    const bucketIndex = urlParts.findIndex(part => part === this.AVATAR_BUCKET);
    if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
      return urlParts.slice(bucketIndex + 1).join('/');
    }
    return url.split('/').pop() || '';
  }

  private convertToAvatar(data: any): Avatar {
    return {
      id: data.id,
      url: data.url,
      type: data.type,
      gender: data.gender,
      isDefault: data.is_default,
      uploadedBy: data.uploaded_by,
      createdAt: data.created_at
    };
  }

  private getEmptyCollection(): AvatarCollection {
    return {
      standard: {
        male: [],
        female: []
      },
      vip: {
        male: [],
        female: []
      }
    };
  }

  // Admin avatar management
  async uploadAdminAvatar(
    file: File,
    adminId: string
  ): Promise<AdminActionResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.message
        };
      }

      // Generate unique filename for admin avatar
      const fileExtension = file.name.split('.').pop();
      const fileName = `admin/${adminId}-${Date.now()}.${fileExtension}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.AVATAR_BUCKET)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true // Allow overwriting existing admin avatar
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.AVATAR_BUCKET)
        .getPublicUrl(fileName);

      const avatarUrl = urlData.publicUrl;

      // Update admin user's avatar
      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar: avatarUrl })
        .eq("id", adminId);

      if (updateError) {
        // Cleanup uploaded file if user update fails
        await this.deleteFileFromStorage(fileName);
        throw new Error(updateError.message);
      }

      return {
        success: true,
        message: 'Admin avatar uploaded successfully',
        data: { adminId, avatarUrl }
      };
    } catch (error) {
      logger.error("Error uploading admin avatar:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to upload admin avatar'
      };
    }
  }

  // Organize avatars (reorder, categorize)
  async organizeAvatars(
    avatarIds: string[],
    newOrder: number[],
    adminId?: string
  ): Promise<AdminActionResult> {
    try {
      if (avatarIds.length !== newOrder.length) {
        return {
          success: false,
          message: 'Avatar IDs and order array must have the same length'
        };
      }

      // Update display order for each avatar
      const updates = avatarIds.map((id, index) => ({
        id,
        display_order: newOrder[index]
      }));

      for (const update of updates) {
        await supabase
          .from("avatars")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
      }

      return {
        success: true,
        message: `Organized ${avatarIds.length} avatars`,
        data: { updatedCount: avatarIds.length }
      };
    } catch (error) {
      logger.error("Error organizing avatars:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to organize avatars'
      };
    }
  }
}

export const avatarService = new AvatarService();