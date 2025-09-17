import { supabase } from "../../config/supabase";
import type { AdminActionResult } from "../../types/admin.types";
import type { User } from "../../types/user.types";
import { createServiceLogger } from "../../utils/logger";

const logger = createServiceLogger('BotService');

export interface Bot {
  id: string;
  userId: string;
  nickname: string;
  age: number;
  gender: 'male' | 'female';
  country: string;
  interests: string[];
  behaviorSettings: BotBehaviorSettings;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface BotBehaviorSettings {
  responseDelay: number; // milliseconds
  activityLevel: 'low' | 'medium' | 'high';
  conversationStyle: 'friendly' | 'professional' | 'casual';
  autoRespond: boolean;
  maxMessagesPerHour: number;
  onlineHours: {
    start: number; // 0-23
    end: number; // 0-23
  };
}

export interface BotCreateRequest {
  nickname: string;
  age: number;
  gender: 'male' | 'female';
  country: string;
  interests: string[];
  behaviorSettings?: Partial<BotBehaviorSettings>;
  avatar?: string;
}

class BotService {
  // Default bot behavior settings
  private defaultBehaviorSettings: BotBehaviorSettings = {
    responseDelay: 2000, // 2 seconds
    activityLevel: 'medium',
    conversationStyle: 'friendly',
    autoRespond: true,
    maxMessagesPerHour: 30,
    onlineHours: {
      start: 8, // 8 AM
      end: 22  // 10 PM
    }
  };

  // Create a new bot
  async createBot(
    botRequest: BotCreateRequest,
    adminId: string
  ): Promise<AdminActionResult> {
    try {
      // Validate bot request
      const validation = this.validateBotRequest(botRequest);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.message
        };
      }

      // Check if nickname is already taken
      const nicknameExists = await this.isNicknameExists(botRequest.nickname);
      if (nicknameExists) {
        return {
          success: false,
          message: `Nickname "${botRequest.nickname}" is already taken`
        };
      }

      // Create user account for the bot
      const userResult = await this.createBotUser(botRequest);
      if (!userResult.success) {
        return userResult;
      }

      const userId = userResult.data.id;

      // Create bot record
      const behaviorSettings = {
        ...this.defaultBehaviorSettings,
        ...botRequest.behaviorSettings
      };

      const { data, error } = await supabase
        .from("bots")
        .insert({
          user_id: userId,
          interests: botRequest.interests,
          behavior_settings: behaviorSettings,
          is_active: true,
          created_by: adminId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        // Cleanup user if bot creation fails
        await this.deleteUser(userId);
        throw new Error(error.message);
      }

      const bot = await this.convertToBot(data);

      return {
        success: true,
        message: `Bot "${botRequest.nickname}" created successfully`,
        data: bot
      };
    } catch (error) {
      logger.error("Error creating bot:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create bot'
      };
    }
  }

  // Get all bots with pagination
  async getBots(
    page = 1,
    limit = 50,
    activeOnly = false
  ): Promise<{ bots: Bot[]; total: number }> {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from("bots")
        .select(`
          *,
          user:user_id (
            id,
            nickname,
            age,
            gender,
            country,
            avatar,
            online,
            created_at
          )
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (activeOnly) {
        query = query.eq("is_active", true);
      }

      const { data, count, error } = await query;

      if (error) {
        logger.error("Error getting bots:", error);
        return { bots: [], total: 0 };
      }

      const bots = await Promise.all(
        (data || []).map(row => this.convertToBot(row))
      );

      return { bots, total: count || 0 };
    } catch (error) {
      logger.error("Error getting bots:", error);
      return { bots: [], total: 0 };
    }
  }

  // Get a specific bot by ID
  async getBot(botId: string): Promise<Bot | null> {
    try {
      const { data, error } = await supabase
        .from("bots")
        .select(`
          *,
          user:user_id (
            id,
            nickname,
            age,
            gender,
            country,
            avatar,
            online,
            created_at
          )
        `)
        .eq("id", botId)
        .single();

      if (error || !data) {
        return null;
      }

      return await this.convertToBot(data);
    } catch (error) {
      logger.error("Error getting bot:", error);
      return null;
    }
  }

  // Update bot configuration
  async updateBot(
    botId: string,
    updates: Partial<BotCreateRequest>,
    adminId?: string
  ): Promise<AdminActionResult> {
    try {
      const bot = await this.getBot(botId);
      if (!bot) {
        return {
          success: false,
          message: 'Bot not found'
        };
      }

      // Update user information if provided
      if (updates.nickname || updates.age || updates.gender || updates.country || updates.avatar) {
        const userUpdates: any = {};
        if (updates.nickname) userUpdates.nickname = updates.nickname;
        if (updates.age) userUpdates.age = updates.age;
        if (updates.gender) userUpdates.gender = updates.gender;
        if (updates.country) userUpdates.country = updates.country;
        if (updates.avatar) userUpdates.avatar = updates.avatar;

        const { error: userError } = await supabase
          .from("users")
          .update(userUpdates)
          .eq("id", bot.userId);

        if (userError) {
          throw new Error(userError.message);
        }
      }

      // Update bot-specific information
      const botUpdates: any = {};
      if (updates.interests) botUpdates.interests = updates.interests;
      if (updates.behaviorSettings) {
        botUpdates.behavior_settings = {
          ...bot.behaviorSettings,
          ...updates.behaviorSettings
        };
      }

      if (Object.keys(botUpdates).length > 0) {
        const { error: botError } = await supabase
          .from("bots")
          .update(botUpdates)
          .eq("id", botId);

        if (botError) {
          throw new Error(botError.message);
        }
      }

      const updatedBot = await this.getBot(botId);

      return {
        success: true,
        message: `Bot "${bot.nickname}" updated successfully`,
        data: updatedBot
      };
    } catch (error) {
      logger.error("Error updating bot:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update bot'
      };
    }
  }

  // Toggle bot active status
  async toggleBotStatus(botId: string, adminId?: string): Promise<AdminActionResult> {
    try {
      const bot = await this.getBot(botId);
      if (!bot) {
        return {
          success: false,
          message: 'Bot not found'
        };
      }

      const newStatus = !bot.isActive;

      const { error } = await supabase
        .from("bots")
        .update({ is_active: newStatus })
        .eq("id", botId);

      if (error) {
        throw new Error(error.message);
      }

      // Update user online status based on bot status
      await supabase
        .from("users")
        .update({ online: newStatus })
        .eq("id", bot.userId);

      // Update presence
      if (newStatus) {
        await supabase
          .from("presence")
          .upsert({
            user_id: bot.userId,
            online: true,
            last_seen: new Date().toISOString(),
            nickname: bot.nickname,
            gender: bot.gender,
            age: bot.age,
            country: bot.country,
            role: 'standard',
            avatar: '', // Will be updated with actual avatar
            joined_at: new Date().toISOString()
          });
      } else {
        await supabase
          .from("presence")
          .update({ online: false, last_seen: new Date().toISOString() })
          .eq("user_id", bot.userId);
      }

      return {
        success: true,
        message: `Bot "${bot.nickname}" ${newStatus ? 'activated' : 'deactivated'}`,
        data: { botId, isActive: newStatus }
      };
    } catch (error) {
      logger.error("Error toggling bot status:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to toggle bot status'
      };
    }
  }

  // Delete a bot
  async deleteBot(botId: string, adminId?: string): Promise<AdminActionResult> {
    try {
      const bot = await this.getBot(botId);
      if (!bot) {
        return {
          success: false,
          message: 'Bot not found'
        };
      }

      // Delete bot record
      const { error: botError } = await supabase
        .from("bots")
        .delete()
        .eq("id", botId);

      if (botError) {
        throw new Error(botError.message);
      }

      // Delete associated user account
      await this.deleteUser(bot.userId);

      return {
        success: true,
        message: `Bot "${bot.nickname}" deleted successfully`,
        data: { botId, userId: bot.userId }
      };
    } catch (error) {
      logger.error("Error deleting bot:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete bot'
      };
    }
  }

  // Get bot statistics
  async getBotStatistics(): Promise<{
    totalBots: number;
    activeBots: number;
    onlineBots: number;
    botsByGender: { male: number; female: number };
    botsByActivityLevel: { low: number; medium: number; high: number };
  }> {
    try {
      const [totalResult, activeResult, onlineResult] = await Promise.all([
        supabase.from("bots").select("*", { count: "exact", head: true }),
        supabase.from("bots").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("bots").select(`
          *,
          user:user_id!inner (online)
        `, { count: "exact", head: true }).eq("user.online", true)
      ]);

      // Get detailed statistics
      const { data: botsData } = await supabase
        .from("bots")
        .select(`
          *,
          user:user_id (gender)
        `);

      const botsByGender = { male: 0, female: 0 };
      const botsByActivityLevel = { low: 0, medium: 0, high: 0 };

      if (botsData) {
        for (const bot of botsData) {
          // Count by gender
          if (bot.user?.gender) {
            botsByGender[bot.user.gender as 'male' | 'female']++;
          }

          // Count by activity level
          const activityLevel = bot.behavior_settings?.activityLevel || 'medium';
          if (activityLevel in botsByActivityLevel) {
            botsByActivityLevel[activityLevel as keyof typeof botsByActivityLevel]++;
          }
        }
      }

      return {
        totalBots: totalResult.count || 0,
        activeBots: activeResult.count || 0,
        onlineBots: onlineResult.count || 0,
        botsByGender,
        botsByActivityLevel
      };
    } catch (error) {
      logger.error("Error getting bot statistics:", error);
      return {
        totalBots: 0,
        activeBots: 0,
        onlineBots: 0,
        botsByGender: { male: 0, female: 0 },
        botsByActivityLevel: { low: 0, medium: 0, high: 0 }
      };
    }
  }

  // Bulk create bots
  async createMultipleBots(
    botRequests: BotCreateRequest[],
    adminId: string
  ): Promise<AdminActionResult[]> {
    const results: AdminActionResult[] = [];

    for (const botRequest of botRequests) {
      const result = await this.createBot(botRequest, adminId);
      results.push(result);
    }

    return results;
  }

  // Get bots by activity level
  async getBotsByActivityLevel(activityLevel: 'low' | 'medium' | 'high'): Promise<Bot[]> {
    try {
      const { data, error } = await supabase
        .from("bots")
        .select(`
          *,
          user:user_id (
            id,
            nickname,
            age,
            gender,
            country,
            avatar,
            online,
            created_at
          )
        `)
        .eq("behavior_settings->>activityLevel", activityLevel)
        .eq("is_active", true);

      if (error) {
        logger.error("Error getting bots by activity level:", error);
        return [];
      }

      return await Promise.all(
        (data || []).map(row => this.convertToBot(row))
      );
    } catch (error) {
      logger.error("Error getting bots by activity level:", error);
      return [];
    }
  }

  // Private helper methods
  private validateBotRequest(request: BotCreateRequest): { isValid: boolean; message: string } {
    if (!request.nickname || request.nickname.trim().length === 0) {
      return { isValid: false, message: 'Nickname is required' };
    }

    if (request.nickname.length > 50) {
      return { isValid: false, message: 'Nickname must be 50 characters or less' };
    }

    if (!request.age || request.age < 18 || request.age > 100) {
      return { isValid: false, message: 'Age must be between 18 and 100' };
    }

    if (!['male', 'female'].includes(request.gender)) {
      return { isValid: false, message: 'Gender must be male or female' };
    }

    if (!request.country || request.country.trim().length === 0) {
      return { isValid: false, message: 'Country is required' };
    }

    if (!Array.isArray(request.interests)) {
      return { isValid: false, message: 'Interests must be an array' };
    }

    return { isValid: true, message: '' };
  }

  private async isNicknameExists(nickname: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("nickname", nickname)
        .limit(1);

      return !error && data && data.length > 0;
    } catch (error) {
      logger.error("Error checking nickname existence:", error);
      return false;
    }
  }

  private async createBotUser(botRequest: BotCreateRequest): Promise<AdminActionResult> {
    try {
      const { data, error } = await supabase
        .from("users")
        .insert({
          nickname: botRequest.nickname,
          role: 'standard',
          gender: botRequest.gender,
          age: botRequest.age,
          country: botRequest.country,
          avatar: botRequest.avatar || '',
          status: 'active',
          online: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        message: 'Bot user created successfully',
        data: data
      };
    } catch (error) {
      logger.error("Error creating bot user:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create bot user'
      };
    }
  }

  private async deleteUser(userId: string): Promise<void> {
    try {
      // Delete related records first
      await Promise.all([
        supabase.from("presence").delete().eq("user_id", userId),
        supabase.from("messages").delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
        supabase.from("blocks").delete().or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
        supabase.from("reports").delete().or(`reporter_id.eq.${userId},reported_id.eq.${userId}`)
      ]);

      // Delete user
      await supabase.from("users").delete().eq("id", userId);
    } catch (error) {
      logger.error("Error deleting user:", error);
    }
  }

  private async convertToBot(data: any): Promise<Bot> {
    const user = data.user || {};
    
    return {
      id: data.id,
      userId: data.user_id,
      nickname: user.nickname || '',
      age: user.age || 0,
      gender: user.gender || 'male',
      country: user.country || '',
      interests: data.interests || [],
      behaviorSettings: data.behavior_settings || this.defaultBehaviorSettings,
      isActive: data.is_active || false,
      createdBy: data.created_by,
      createdAt: data.created_at
    };
  }

  // Bot automation methods
  async activateAllBots(adminId?: string): Promise<AdminActionResult> {
    try {
      const { error } = await supabase
        .from("bots")
        .update({ is_active: true })
        .eq("is_active", false);

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        message: 'All bots activated successfully'
      };
    } catch (error) {
      logger.error("Error activating all bots:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to activate all bots'
      };
    }
  }

  async deactivateAllBots(adminId?: string): Promise<AdminActionResult> {
    try {
      const { error } = await supabase
        .from("bots")
        .update({ is_active: false })
        .eq("is_active", true);

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        message: 'All bots deactivated successfully'
      };
    } catch (error) {
      logger.error("Error deactivating all bots:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to deactivate all bots'
      };
    }
  }
}

export const botService = new BotService();