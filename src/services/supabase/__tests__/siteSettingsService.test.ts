import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { siteSettingsService } from '../siteSettingsService';
import { supabase } from '../../../config/supabase';
import type { SiteSettings } from '../siteSettingsService';

// Mock supabase
vi.mock('../../../config/supabase', () => ({
  supabase: {
    from: vi.fn(() => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
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
    channel: vi.fn(() => ({
      send: vi.fn().mockResolvedValue({ error: null }),
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({}),
    })),
    removeChannel: vi.fn(),
  },
}));

describe('SiteSettingsService', () => {
  const mockSupabaseFrom = vi.mocked(supabase.from);
  const mockSupabaseChannel = vi.mocked(supabase.channel);
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSetting', () => {
    it('should return setting value from database', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            value: '10',
            type: 'number'
          },
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await siteSettingsService.getSetting('maxImageUploadsStandard');

      expect(result).toBe(10);
      expect(mockSelectChain.select).toHaveBeenCalledWith('value, type');
      expect(mockSelectChain.eq).toHaveBeenCalledWith('key', 'maxImageUploadsStandard');
    });

    it('should return default value when setting not found', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await siteSettingsService.getSetting('maxImageUploadsStandard');

      expect(result).toBe(10); // Default value
    });

    it('should parse JSON values correctly', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            value: '["link1", "link2", "link3"]',
            type: 'json'
          },
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await siteSettingsService.getSetting('adsenseLinks');

      expect(result).toEqual(['link1', 'link2', 'link3']);
    });

    it('should parse boolean values correctly', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            value: 'true',
            type: 'boolean'
          },
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await siteSettingsService.getSetting('maintenanceMode');

      expect(result).toBe(true);
    });
  });

  describe('updateSetting', () => {
    it('should successfully update a setting', async () => {
      const mockUpsertChain = {
        upsert: vi.fn().mockResolvedValue({ error: null })
      };

      const mockChannelChain = {
        send: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom.mockReturnValue(mockUpsertChain as any);
      mockSupabaseChannel.mockReturnValue(mockChannelChain as any);

      const result = await siteSettingsService.updateSetting('maxImageUploadsStandard', 15, 'admin-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe("Setting 'maxImageUploadsStandard' updated successfully");
      expect(result.data).toEqual({ key: 'maxImageUploadsStandard', value: 15 });
      expect(mockUpsertChain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'maxImageUploadsStandard',
          value: '15',
          type: 'number'
        }),
        { onConflict: 'key' }
      );
    });

    it('should handle database errors gracefully', async () => {
      const mockUpsertChain = {
        upsert: vi.fn().mockResolvedValue({ error: { message: 'Database error' } })
      };

      mockSupabaseFrom.mockReturnValue(mockUpsertChain as any);

      const result = await siteSettingsService.updateSetting('testKey', 'testValue');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Database error');
    });

    it('should serialize JSON values correctly', async () => {
      const mockUpsertChain = {
        upsert: vi.fn().mockResolvedValue({ error: null })
      };

      const mockChannelChain = {
        send: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom.mockReturnValue(mockUpsertChain as any);
      mockSupabaseChannel.mockReturnValue(mockChannelChain as any);

      const testObject = { monthly: 9.99, quarterly: 24.99, yearly: 89.99 };
      await siteSettingsService.updateSetting('vipPrices', testObject);

      expect(mockUpsertChain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          value: JSON.stringify(testObject),
          type: 'json'
        }),
        { onConflict: 'key' }
      );
    });
  });

  describe('getAllSettings', () => {
    it('should return all settings with defaults', async () => {
      const mockSelectChain = {
        select: vi.fn().mockResolvedValue({
          data: [
            {
              key: 'maxImageUploadsStandard',
              value: '20',
              type: 'number'
            },
            {
              key: 'maintenanceMode',
              value: 'true',
              type: 'boolean'
            }
          ],
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await siteSettingsService.getAllSettings();

      expect(result.maxImageUploadsStandard).toBe(20);
      expect(result.maintenanceMode).toBe(true);
      expect(result.adsenseLinks).toEqual(['', '', '']); // Default value
    });

    it('should return default settings on database error', async () => {
      const mockSelectChain = {
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await siteSettingsService.getAllSettings();

      expect(result.maxImageUploadsStandard).toBe(10);
      expect(result.maintenanceMode).toBe(false);
      expect(result.adsenseLinks).toEqual(['', '', '']);
    });
  });

  describe('updateAdSenseLinks', () => {
    it('should successfully update AdSense links', async () => {
      const mockUpsertChain = {
        upsert: vi.fn().mockResolvedValue({ error: null })
      };

      const mockChannelChain = {
        send: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom.mockReturnValue(mockUpsertChain as any);
      mockSupabaseChannel.mockReturnValue(mockChannelChain as any);

      const links = ['link1', 'link2', 'link3'];
      const result = await siteSettingsService.updateAdSenseLinks(links, 'admin-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ key: 'adsenseLinks', value: links });
    });

    it('should reject invalid number of links', async () => {
      const result = await siteSettingsService.updateAdSenseLinks(['link1', 'link2'], 'admin-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Exactly 3 AdSense links are required');
    });
  });

  describe('toggleMaintenanceMode', () => {
    it('should toggle maintenance mode from false to true', async () => {
      // Mock getSetting to return false
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            value: 'false',
            type: 'boolean'
          },
          error: null
        })
      };

      const mockUpsertChain = {
        upsert: vi.fn().mockResolvedValue({ error: null })
      };

      const mockChannelChain = {
        send: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockSelectChain as any) // getSetting call
        .mockReturnValueOnce(mockUpsertChain as any); // updateSetting call

      mockSupabaseChannel.mockReturnValue(mockChannelChain as any);

      const result = await siteSettingsService.toggleMaintenanceMode('admin-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Maintenance mode enabled');
      expect(result.data).toEqual({ maintenanceMode: true });
    });

    it('should toggle maintenance mode from true to false', async () => {
      // Mock getSetting to return true
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            value: 'true',
            type: 'boolean'
          },
          error: null
        })
      };

      const mockUpsertChain = {
        upsert: vi.fn().mockResolvedValue({ error: null })
      };

      const mockChannelChain = {
        send: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockSelectChain as any)
        .mockReturnValueOnce(mockUpsertChain as any);

      mockSupabaseChannel.mockReturnValue(mockChannelChain as any);

      const result = await siteSettingsService.toggleMaintenanceMode('admin-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Maintenance mode disabled');
      expect(result.data).toEqual({ maintenanceMode: false });
    });
  });

  describe('updateMaxImageUploads', () => {
    it('should successfully update max image uploads', async () => {
      const mockUpsertChain = {
        upsert: vi.fn().mockResolvedValue({ error: null })
      };

      const mockChannelChain = {
        send: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom.mockReturnValue(mockUpsertChain as any);
      mockSupabaseChannel.mockReturnValue(mockChannelChain as any);

      const result = await siteSettingsService.updateMaxImageUploads(25, 'admin-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ key: 'maxImageUploadsStandard', value: 25 });
    });

    it('should reject invalid upload counts', async () => {
      const resultTooLow = await siteSettingsService.updateMaxImageUploads(0, 'admin-123');
      const resultTooHigh = await siteSettingsService.updateMaxImageUploads(101, 'admin-123');

      expect(resultTooLow.success).toBe(false);
      expect(resultTooLow.message).toBe('Image upload count must be between 1 and 100');
      
      expect(resultTooHigh.success).toBe(false);
      expect(resultTooHigh.message).toBe('Image upload count must be between 1 and 100');
    });
  });

  describe('updateVipPrices', () => {
    it('should successfully update VIP prices', async () => {
      // Mock getSetting to return current prices
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            value: '{"monthly":9.99,"quarterly":24.99,"yearly":89.99}',
            type: 'json'
          },
          error: null
        })
      };

      const mockUpsertChain = {
        upsert: vi.fn().mockResolvedValue({ error: null })
      };

      const mockChannelChain = {
        send: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockSelectChain as any) // getSetting call
        .mockReturnValueOnce(mockUpsertChain as any); // updateSetting call

      mockSupabaseChannel.mockReturnValue(mockChannelChain as any);

      const newPrices = { monthly: 12.99, quarterly: 29.99 };
      const result = await siteSettingsService.updateVipPrices(newPrices, 'admin-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        key: 'vipPrices',
        value: {
          monthly: 12.99,
          quarterly: 29.99,
          yearly: 89.99 // Should keep existing value
        }
      });
    });

    it('should reject invalid prices', async () => {
      // Mock getSetting to return current prices
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            value: '{"monthly":9.99,"quarterly":24.99,"yearly":89.99}',
            type: 'json'
          },
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const invalidPrices = { monthly: -5 };
      const result = await siteSettingsService.updateVipPrices(invalidPrices, 'admin-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid price for monthly: must be a positive number');
    });
  });

  describe('deleteSetting', () => {
    it('should successfully delete a setting', async () => {
      const mockDeleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      const mockChannelChain = {
        send: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom.mockReturnValue(mockDeleteChain as any);
      mockSupabaseChannel.mockReturnValue(mockChannelChain as any);

      const result = await siteSettingsService.deleteSetting('maxImageUploadsStandard', 'admin-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe("Setting 'maxImageUploadsStandard' reset to default");
      expect(result.data).toEqual({ key: 'maxImageUploadsStandard', value: 10 });
    });
  });

  describe('backupSettings', () => {
    it('should create a settings backup', async () => {
      const mockSelectChain = {
        select: vi.fn().mockResolvedValue({
          data: [
            {
              key: 'maxImageUploadsStandard',
              value: '20',
              type: 'number'
            }
          ],
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await siteSettingsService.backupSettings();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Settings backup created successfully');
      expect(result.data).toHaveProperty('timestamp');
      expect(result.data).toHaveProperty('settings');
      expect(result.data.settings.maxImageUploadsStandard).toBe(20);
    });
  });

  describe('subscribeToSettingChanges', () => {
    it('should set up subscription and return unsubscribe function', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({})
      };

      mockSupabaseChannel.mockReturnValue(mockChannel as any);

      const onSettingChange = vi.fn();
      const unsubscribe = siteSettingsService.subscribeToSettingChanges(onSettingChange);

      expect(mockSupabaseChannel).toHaveBeenCalledWith('setting_changes');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'broadcast',
        { event: 'setting_changed' },
        expect.any(Function)
      );
      expect(typeof unsubscribe).toBe('function');
    });

    it('should call onSettingChange when notification is received', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({})
      };

      let broadcastHandler: (payload: any) => void;
      mockChannel.on.mockImplementation((type, config, handler) => {
        broadcastHandler = handler;
        return mockChannel;
      });

      mockSupabaseChannel.mockReturnValue(mockChannel as any);

      const onSettingChange = vi.fn();
      siteSettingsService.subscribeToSettingChanges(onSettingChange);

      // Simulate receiving a setting change notification
      const notification = {
        payload: {
          key: 'maxImageUploadsStandard',
          value: 25
        }
      };

      broadcastHandler!(notification);

      expect(onSettingChange).toHaveBeenCalledWith('maxImageUploadsStandard', 25);
    });
  });
});