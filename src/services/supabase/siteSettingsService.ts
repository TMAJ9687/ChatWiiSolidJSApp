import { supabase } from "../../config/supabase";
import type { AdminActionResult } from "../../types/admin.types";

export interface SiteSettings {
  adsenseLinks: string[]; // 3 AdSense links
  maintenanceMode: boolean;
  maxImageUploadsStandard: number;
  vipPrices: {
    monthly: number;
    quarterly: number;
    yearly: number;
  };
}

export interface SiteSetting {
  id: string;
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json';
  createdAt: string;
  updatedAt: string;
}

class SiteSettingsService {
  // Default settings
  private defaultSettings: SiteSettings = {
    adsenseLinks: ['', '', ''],
    maintenanceMode: false,
    maxImageUploadsStandard: 10,
    vipPrices: {
      monthly: 9.99,
      quarterly: 24.99,
      yearly: 89.99
    }
  };

  // Get a specific setting by key
  async getSetting(key: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value, type")
        .eq("key", key)
        .single();

      if (error) {
        console.warn(`Setting '${key}' not found, returning default`);
        return this.getDefaultValue(key);
      }

      return this.parseValue(data.value, data.type);
    } catch (error) {
      console.error(`Error getting setting '${key}':`, error);
      return this.getDefaultValue(key);
    }
  }

  // Update or create a setting
  async updateSetting(
    key: string, 
    value: any, 
    adminId?: string
  ): Promise<AdminActionResult> {
    try {
      const type = this.getValueType(value);
      const serializedValue = this.serializeValue(value, type);
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("site_settings")
        .upsert({
          key,
          value: serializedValue,
          type,
          updated_at: now
        }, {
          onConflict: 'key'
        });

      if (error) {
        throw new Error(error.message);
      }

      // Broadcast setting change for real-time updates
      await this.broadcastSettingChange(key, value);

      return {
        success: true,
        message: `Setting '${key}' updated successfully`,
        data: { key, value }
      };
    } catch (error) {
      console.error(`Error updating setting '${key}':`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update setting'
      };
    }
  }

  // Get all settings
  async getAllSettings(): Promise<SiteSettings> {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*");

      if (error) {
        console.error("Error getting all settings:", error);
        return this.defaultSettings;
      }

      const settings = { ...this.defaultSettings };
      
      if (data) {
        for (const row of data) {
          const value = this.parseValue(row.value, row.type);
          this.setNestedValue(settings, row.key, value);
        }
      }

      return settings;
    } catch (error) {
      console.error("Error getting all settings:", error);
      return this.defaultSettings;
    }
  }

  // Update multiple settings at once
  async updateMultipleSettings(
    updates: Record<string, any>,
    adminId?: string
  ): Promise<AdminActionResult> {
    try {
      const now = new Date().toISOString();
      const settingsToUpsert = Object.entries(updates).map(([key, value]) => ({
        key,
        value: this.serializeValue(value, this.getValueType(value)),
        type: this.getValueType(value),
        updated_at: now
      }));

      const { error } = await supabase
        .from("site_settings")
        .upsert(settingsToUpsert, {
          onConflict: 'key'
        });

      if (error) {
        throw new Error(error.message);
      }

      // Broadcast all setting changes
      for (const [key, value] of Object.entries(updates)) {
        await this.broadcastSettingChange(key, value);
      }

      return {
        success: true,
        message: `${Object.keys(updates).length} settings updated successfully`,
        data: updates
      };
    } catch (error) {
      console.error("Error updating multiple settings:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update settings'
      };
    }
  }

  // AdSense link management
  async updateAdSenseLinks(links: string[], adminId?: string): Promise<AdminActionResult> {
    if (links.length !== 3) {
      return {
        success: false,
        message: 'Exactly 3 AdSense links are required'
      };
    }

    return await this.updateSetting('adsenseLinks', links, adminId);
  }

  async getAdSenseLinks(): Promise<string[]> {
    return await this.getSetting('adsenseLinks');
  }

  // Maintenance mode management
  async toggleMaintenanceMode(adminId?: string): Promise<AdminActionResult> {
    try {
      const currentMode = await this.getSetting('maintenanceMode');
      const newMode = !currentMode;
      
      const result = await this.updateSetting('maintenanceMode', newMode, adminId);
      
      if (result.success) {
        result.message = `Maintenance mode ${newMode ? 'enabled' : 'disabled'}`;
        result.data = { maintenanceMode: newMode };
      }
      
      return result;
    } catch (error) {
      console.error("Error toggling maintenance mode:", error);
      return {
        success: false,
        message: 'Failed to toggle maintenance mode'
      };
    }
  }

  async setMaintenanceMode(enabled: boolean, adminId?: string): Promise<AdminActionResult> {
    return await this.updateSetting('maintenanceMode', enabled, adminId);
  }

  async isMaintenanceMode(): Promise<boolean> {
    return await this.getSetting('maintenanceMode');
  }

  // Image upload limits
  async updateMaxImageUploads(count: number, adminId?: string): Promise<AdminActionResult> {
    if (count < 1 || count > 100) {
      return {
        success: false,
        message: 'Image upload count must be between 1 and 100'
      };
    }

    return await this.updateSetting('maxImageUploadsStandard', count, adminId);
  }

  async getMaxImageUploads(): Promise<number> {
    return await this.getSetting('maxImageUploadsStandard');
  }

  // VIP pricing management
  async updateVipPrices(
    prices: { monthly?: number; quarterly?: number; yearly?: number },
    adminId?: string
  ): Promise<AdminActionResult> {
    try {
      const currentPrices = await this.getSetting('vipPrices');
      const updatedPrices = { ...currentPrices, ...prices };

      // Validate prices
      for (const [tier, price] of Object.entries(updatedPrices)) {
        if (typeof price !== 'number' || price < 0) {
          return {
            success: false,
            message: `Invalid price for ${tier}: must be a positive number`
          };
        }
      }

      return await this.updateSetting('vipPrices', updatedPrices, adminId);
    } catch (error) {
      console.error("Error updating VIP prices:", error);
      return {
        success: false,
        message: 'Failed to update VIP prices'
      };
    }
  }

  async getVipPrices(): Promise<{ monthly: number; quarterly: number; yearly: number }> {
    return await this.getSetting('vipPrices');
  }

  // Delete a setting (reset to default)
  async deleteSetting(key: string, adminId?: string): Promise<AdminActionResult> {
    try {
      const { error } = await supabase
        .from("site_settings")
        .delete()
        .eq("key", key);

      if (error) {
        throw new Error(error.message);
      }

      // Broadcast setting deletion
      const defaultValue = this.getDefaultValue(key);
      await this.broadcastSettingChange(key, defaultValue);

      return {
        success: true,
        message: `Setting '${key}' reset to default`,
        data: { key, value: defaultValue }
      };
    } catch (error) {
      console.error(`Error deleting setting '${key}':`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete setting'
      };
    }
  }

  // Get settings history/audit trail
  async getSettingsHistory(limit = 50): Promise<SiteSetting[]> {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error getting settings history:", error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        key: row.key,
        value: this.parseValue(row.value, row.type),
        type: row.type,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error("Error getting settings history:", error);
      return [];
    }
  }

  // Backup settings to JSON
  async backupSettings(): Promise<AdminActionResult> {
    try {
      const settings = await this.getAllSettings();
      const backup = {
        timestamp: new Date().toISOString(),
        settings
      };

      return {
        success: true,
        message: 'Settings backup created successfully',
        data: backup
      };
    } catch (error) {
      console.error("Error creating settings backup:", error);
      return {
        success: false,
        message: 'Failed to create settings backup'
      };
    }
  }

  // Restore settings from backup
  async restoreSettings(
    backup: { settings: SiteSettings },
    adminId?: string
  ): Promise<AdminActionResult> {
    try {
      const flatSettings = this.flattenSettings(backup.settings);
      return await this.updateMultipleSettings(flatSettings, adminId);
    } catch (error) {
      console.error("Error restoring settings:", error);
      return {
        success: false,
        message: 'Failed to restore settings'
      };
    }
  }

  // Subscribe to setting changes (for real-time updates)
  subscribeToSettingChanges(
    onSettingChange: (key: string, value: any) => void
  ): () => void {
    const channel = supabase
      .channel('setting_changes')
      .on('broadcast', { event: 'setting_changed' }, (payload) => {
        onSettingChange(payload.payload.key, payload.payload.value);
      })
      .subscribe();

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Private helper methods
  private getValueType(value: any): 'string' | 'number' | 'boolean' | 'json' {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    return 'json';
  }

  private serializeValue(value: any, type: string): string {
    if (type === 'json') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private parseValue(value: string, type: string): any {
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true';
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  private getDefaultValue(key: string): any {
    const keys = key.split('.');
    let value: any = this.defaultSettings;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  private setNestedValue(obj: any, key: string, value: any): void {
    const keys = key.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  private flattenSettings(settings: SiteSettings, prefix = ''): Record<string, any> {
    const flattened: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(settings)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenSettings(value, fullKey));
      } else {
        flattened[fullKey] = value;
      }
    }
    
    return flattened;
  }

  private async broadcastSettingChange(key: string, value: any): Promise<void> {
    try {
      await supabase
        .channel('setting_changes')
        .send({
          type: 'broadcast',
          event: 'setting_changed',
          payload: { key, value }
        });
    } catch (error) {
      console.error("Error broadcasting setting change:", error);
    }
  }
}

export const siteSettingsService = new SiteSettingsService();