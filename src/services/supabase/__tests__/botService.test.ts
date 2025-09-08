import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { botService } from '../botService';
import { supabase } from '../../../config/supabase';
import type { Bot, BotCreateRequest } from '../botService';

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
        or: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
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
  },
}));

describe('BotService', () => {
  const mockSupabaseFrom = vi.mocked(supabase.from);
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createBot', () => {
    const validBotRequest: BotCreateRequest = {
      nickname: 'TestBot',
      age: 25,
      gender: 'female',
      country: 'USA',
      interests: ['gaming', 'music'],
      behaviorSettings: {
        activityLevel: 'high',
        conversationStyle: 'friendly'
      }
    };

    it('should successfully create a bot', async () => {
      // Mock nickname check (not exists)
      const mockNicknameCheck = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };

      // Mock user creation
      const mockUserInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'user-123',
            nickname: 'TestBot',
            age: 25,
            gender: 'female',
            country: 'USA'
          },
          error: null
        })
      };

      // Mock bot creation
      const mockBotInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'bot-123',
            user_id: 'user-123',
            interests: ['gaming', 'music'],
            behavior_settings: {
              responseDelay: 2000,
              activityLevel: 'high',
              conversationStyle: 'friendly',
              autoRespond: true,
              maxMessagesPerHour: 30,
              onlineHours: { start: 8, end: 22 }
            },
            is_active: true,
            created_by: 'admin-123',
            created_at: '2024-01-01T12:00:00Z'
          },
          error: null
        })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockNicknameCheck as any) // Check nickname
        .mockReturnValueOnce(mockUserInsert as any) // Create user
        .mockReturnValueOnce(mockBotInsert as any); // Create bot

      const result = await botService.createBot(validBotRequest, 'admin-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Bot "TestBot" created successfully');
      expect(result.data).toHaveProperty('id', 'bot-123');
      expect(result.data).toHaveProperty('nickname', 'TestBot');
    });

    it('should reject invalid bot requests', async () => {
      const invalidRequest: BotCreateRequest = {
        nickname: '', // Invalid: empty nickname
        age: 25,
        gender: 'female',
        country: 'USA',
        interests: []
      };

      const result = await botService.createBot(invalidRequest, 'admin-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Nickname is required');
    });

    it('should reject duplicate nicknames', async () => {
      // Mock nickname check (exists)
      const mockNicknameCheck = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [{ id: 'existing-user' }],
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockNicknameCheck as any);

      const result = await botService.createBot(validBotRequest, 'admin-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Nickname "TestBot" is already taken');
    });

    it('should validate age range', async () => {
      const invalidAgeRequest: BotCreateRequest = {
        ...validBotRequest,
        age: 15 // Invalid: under 18
      };

      const result = await botService.createBot(invalidAgeRequest, 'admin-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Age must be between 18 and 100');
    });

    it('should validate gender', async () => {
      const invalidGenderRequest: BotCreateRequest = {
        ...validBotRequest,
        gender: 'other' as any // Invalid gender
      };

      const result = await botService.createBot(invalidGenderRequest, 'admin-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Gender must be male or female');
    });

    it('should validate nickname length', async () => {
      const longNicknameRequest: BotCreateRequest = {
        ...validBotRequest,
        nickname: 'a'.repeat(51) // Too long
      };

      const result = await botService.createBot(longNicknameRequest, 'admin-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Nickname must be 50 characters or less');
    });
  });

  describe('getBots', () => {
    it('should return list of bots with pagination', async () => {
      const mockBots = [
        {
          id: 'bot-1',
          user_id: 'user-1',
          interests: ['gaming'],
          behavior_settings: {},
          is_active: true,
          created_by: 'admin-123',
          created_at: '2024-01-01T12:00:00Z',
          user: {
            id: 'user-1',
            nickname: 'Bot1',
            age: 25,
            gender: 'female',
            country: 'USA',
            avatar: '',
            online: true,
            created_at: '2024-01-01T12:00:00Z'
          }
        }
      ];

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockBots,
          count: 1,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await botService.getBots(1, 10);

      expect(result.bots).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.bots[0].nickname).toBe('Bot1');
    });

    it('should filter active bots only', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          count: 0,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await botService.getBots(1, 10, true);

      expect(mockSelectChain.eq).toHaveBeenCalledWith('is_active', true);
      expect(result.bots).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: null,
          count: 0,
          error: { message: 'Database error' }
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await botService.getBots();

      expect(result.bots).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getBot', () => {
    it('should return a specific bot by ID', async () => {
      const mockBot = {
        id: 'bot-123',
        user_id: 'user-123',
        interests: ['gaming'],
        behavior_settings: {},
        is_active: true,
        created_by: 'admin-123',
        created_at: '2024-01-01T12:00:00Z',
        user: {
          id: 'user-123',
          nickname: 'TestBot',
          age: 25,
          gender: 'female',
          country: 'USA',
          avatar: '',
          online: true,
          created_at: '2024-01-01T12:00:00Z'
        }
      };

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockBot,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await botService.getBot('bot-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('bot-123');
      expect(result?.nickname).toBe('TestBot');
    });

    it('should return null for non-existent bot', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await botService.getBot('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('toggleBotStatus', () => {
    it('should toggle bot status from inactive to active', async () => {
      // Mock getBot to return inactive bot
      const mockBot = {
        id: 'bot-123',
        user_id: 'user-123',
        interests: ['gaming'],
        behavior_settings: {},
        is_active: false,
        created_by: 'admin-123',
        created_at: '2024-01-01T12:00:00Z',
        user: {
          id: 'user-123',
          nickname: 'TestBot',
          age: 25,
          gender: 'female',
          country: 'USA',
          avatar: '',
          online: false,
          created_at: '2024-01-01T12:00:00Z'
        }
      };

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockBot,
          error: null
        })
      };

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      const mockUpsertChain = {
        upsert: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockSelectChain as any) // getBot call
        .mockReturnValueOnce(mockUpdateChain as any) // update bot status
        .mockReturnValueOnce(mockUpdateChain as any) // update user online
        .mockReturnValueOnce(mockUpsertChain as any); // upsert presence

      const result = await botService.toggleBotStatus('bot-123', 'admin-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Bot "TestBot" activated');
      expect(result.data).toEqual({ botId: 'bot-123', isActive: true });
    });

    it('should handle non-existent bot', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await botService.toggleBotStatus('non-existent');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Bot not found');
    });
  });

  describe('deleteBot', () => {
    it('should successfully delete a bot and its user', async () => {
      const mockBot = {
        id: 'bot-123',
        user_id: 'user-123',
        interests: ['gaming'],
        behavior_settings: {},
        is_active: true,
        created_by: 'admin-123',
        created_at: '2024-01-01T12:00:00Z',
        user: {
          id: 'user-123',
          nickname: 'TestBot',
          age: 25,
          gender: 'female',
          country: 'USA',
          avatar: '',
          online: true,
          created_at: '2024-01-01T12:00:00Z'
        }
      };

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockBot,
          error: null
        })
      };

      const mockDeleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
        or: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);
      mockSupabaseFrom.mockReturnValue(mockDeleteChain as any);

      const result = await botService.deleteBot('bot-123', 'admin-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Bot "TestBot" deleted successfully');
      expect(result.data).toEqual({ botId: 'bot-123', userId: 'user-123' });
    });

    it('should handle non-existent bot deletion', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await botService.deleteBot('non-existent');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Bot not found');
    });
  });

  describe('getBotStatistics', () => {
    it('should return bot statistics', async () => {
      const mockCountChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      };

      // Mock count queries
      mockCountChain.select.mockResolvedValue({ count: 5, error: null });

      // Mock detailed data query
      const mockDetailedChain = {
        select: vi.fn().mockResolvedValue({
          data: [
            {
              behavior_settings: { activityLevel: 'high' },
              user: { gender: 'male' }
            },
            {
              behavior_settings: { activityLevel: 'medium' },
              user: { gender: 'female' }
            }
          ],
          error: null
        })
      };

      mockSupabaseFrom
        .mockReturnValue(mockCountChain as any) // Count queries
        .mockReturnValue(mockDetailedChain as any); // Detailed query

      const result = await botService.getBotStatistics();

      expect(result.totalBots).toBe(5);
      expect(result.activeBots).toBe(5);
      expect(result.onlineBots).toBe(5);
      expect(result.botsByGender.male).toBe(1);
      expect(result.botsByGender.female).toBe(1);
      expect(result.botsByActivityLevel.high).toBe(1);
      expect(result.botsByActivityLevel.medium).toBe(1);
    });

    it('should handle database errors gracefully', async () => {
      const mockCountChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      };

      mockCountChain.select.mockResolvedValue({ count: null, error: { message: 'Database error' } });

      mockSupabaseFrom.mockReturnValue(mockCountChain as any);

      const result = await botService.getBotStatistics();

      expect(result).toEqual({
        totalBots: 0,
        activeBots: 0,
        onlineBots: 0,
        botsByGender: { male: 0, female: 0 },
        botsByActivityLevel: { low: 0, medium: 0, high: 0 }
      });
    });
  });

  describe('createMultipleBots', () => {
    it('should create multiple bots and return results', async () => {
      const botRequests: BotCreateRequest[] = [
        {
          nickname: 'Bot1',
          age: 25,
          gender: 'male',
          country: 'USA',
          interests: ['gaming']
        },
        {
          nickname: 'Bot2',
          age: 30,
          gender: 'female',
          country: 'Canada',
          interests: ['music']
        }
      ];

      // Mock successful creation for both bots
      const mockNicknameCheck = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null })
      };

      const mockUserInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'user-123' },
          error: null
        })
      };

      const mockBotInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'bot-123', user_id: 'user-123' },
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockNicknameCheck as any);
      mockSupabaseFrom.mockReturnValue(mockUserInsert as any);
      mockSupabaseFrom.mockReturnValue(mockBotInsert as any);

      const results = await botService.createMultipleBots(botRequests, 'admin-123');

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('activateAllBots', () => {
    it('should activate all inactive bots', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom.mockReturnValue(mockUpdateChain as any);

      const result = await botService.activateAllBots('admin-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('All bots activated successfully');
      expect(mockUpdateChain.update).toHaveBeenCalledWith({ is_active: true });
      expect(mockUpdateChain.eq).toHaveBeenCalledWith('is_active', false);
    });

    it('should handle database errors when activating all bots', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'Database error' } })
      };

      mockSupabaseFrom.mockReturnValue(mockUpdateChain as any);

      const result = await botService.activateAllBots('admin-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Database error');
    });
  });

  describe('deactivateAllBots', () => {
    it('should deactivate all active bots', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom.mockReturnValue(mockUpdateChain as any);

      const result = await botService.deactivateAllBots('admin-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('All bots deactivated successfully');
      expect(mockUpdateChain.update).toHaveBeenCalledWith({ is_active: false });
      expect(mockUpdateChain.eq).toHaveBeenCalledWith('is_active', true);
    });
  });
});