import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { profanityService } from '../profanityService';
import { supabase } from '../../../config/supabase';
import type { ProfanityWord, ProfanityCheckResult } from '../profanityService';

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
        gte: vi.fn().mockReturnThis(),
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
  },
}));

describe('ProfanityService', () => {
  const mockSupabaseFrom = vi.mocked(supabase.from);
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear cache before each test
    (profanityService as any).nicknameWordsCache.clear();
    (profanityService as any).chatWordsCache.clear();
    (profanityService as any).cacheLastUpdated = { nickname: 0, chat: 0 };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('addWord', () => {
    it('should successfully add a profanity word', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        })
      };

      const mockInsertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'word-123',
            word: 'badword',
            type: 'chat',
            created_by: 'admin-123',
            created_at: '2024-01-01T12:00:00Z'
          },
          error: null
        })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockSelectChain as any) // Check existing word
        .mockReturnValueOnce(mockInsertChain as any); // Insert new word

      const result = await profanityService.addWord('badword', 'chat', 'admin-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Word "badword" added to chat filter');
      expect(result.data).toHaveProperty('id', 'word-123');
      expect(mockInsertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          word: 'badword',
          type: 'chat',
          created_by: 'admin-123'
        })
      );
    });

    it('should reject empty words', async () => {
      const result = await profanityService.addWord('   ', 'chat', 'admin-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Word cannot be empty');
    });

    it('should reject duplicate words', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'existing-word',
            word: 'badword',
            type: 'chat',
            created_by: 'admin-123',
            created_at: '2024-01-01T12:00:00Z'
          },
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await profanityService.addWord('badword', 'chat', 'admin-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Word "badword" already exists in chat filter');
    });

    it('should normalize words to lowercase', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        })
      };

      const mockInsertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'word-123',
            word: 'badword',
            type: 'chat',
            created_by: 'admin-123',
            created_at: '2024-01-01T12:00:00Z'
          },
          error: null
        })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockSelectChain as any)
        .mockReturnValueOnce(mockInsertChain as any);

      const result = await profanityService.addWord('BADWORD', 'chat', 'admin-123');

      expect(result.success).toBe(true);
      expect(mockInsertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          word: 'badword' // Should be lowercase
        })
      );
    });
  });

  describe('removeWord', () => {
    it('should successfully remove a profanity word', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            word: 'badword',
            type: 'chat'
          },
          error: null
        })
      };

      const mockDeleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom
        .mockReturnValueOnce(mockSelectChain as any) // Get word details
        .mockReturnValueOnce(mockDeleteChain as any); // Delete word

      const result = await profanityService.removeWord('word-123', 'admin-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Word removed from chat filter');
      expect(result.data).toEqual({
        id: 'word-123',
        word: 'badword',
        type: 'chat'
      });
    });

    it('should handle database errors gracefully', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
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

      const result = await profanityService.removeWord('word-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Database error');
    });
  });

  describe('getWords', () => {
    it('should return all words of a specific type', async () => {
      const mockWords = [
        {
          id: 'word-1',
          word: 'badword1',
          type: 'chat',
          created_by: 'admin-123',
          created_at: '2024-01-01T12:00:00Z'
        },
        {
          id: 'word-2',
          word: 'badword2',
          type: 'chat',
          created_by: 'admin-123',
          created_at: '2024-01-01T11:00:00Z'
        }
      ];

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockWords,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await profanityService.getWords('chat');

      expect(result).toHaveLength(2);
      expect(result[0].word).toBe('badword1');
      expect(result[1].word).toBe('badword2');
      expect(mockSelectChain.eq).toHaveBeenCalledWith('type', 'chat');
    });

    it('should return all words when no type specified', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await profanityService.getWords();

      expect(result).toEqual([]);
      expect(mockSelectChain.eq).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await profanityService.getWords('chat');

      expect(result).toEqual([]);
    });
  });

  describe('checkText', () => {
    beforeEach(async () => {
      // Mock cache update
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            { word: 'badword' },
            { word: 'offensive' }
          ],
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);
      
      // Initialize cache
      await profanityService.initializeCache();
    });

    it('should detect profanity in text', async () => {
      const result = await profanityService.checkText('This is a badword message', 'chat');

      expect(result.isClean).toBe(false);
      expect(result.blockedWords).toContain('badword');
      expect(result.cleanedText).toBe('This is a ******* message');
    });

    it('should return clean for text without profanity', async () => {
      const result = await profanityService.checkText('This is a clean message', 'chat');

      expect(result.isClean).toBe(true);
      expect(result.blockedWords).toEqual([]);
      expect(result.cleanedText).toBe('This is a clean message');
    });

    it('should handle empty or invalid text', async () => {
      const result1 = await profanityService.checkText('', 'chat');
      const result2 = await profanityService.checkText(null as any, 'chat');

      expect(result1.isClean).toBe(true);
      expect(result1.blockedWords).toEqual([]);
      
      expect(result2.isClean).toBe(true);
      expect(result2.blockedWords).toEqual([]);
    });

    it('should detect multiple profane words', async () => {
      const result = await profanityService.checkText('This badword is offensive content', 'chat');

      expect(result.isClean).toBe(false);
      expect(result.blockedWords).toHaveLength(2);
      expect(result.blockedWords).toContain('badword');
      expect(result.blockedWords).toContain('offensive');
    });

    it('should be case insensitive', async () => {
      const result = await profanityService.checkText('This BADWORD is bad', 'chat');

      expect(result.isClean).toBe(false);
      expect(result.blockedWords).toContain('badword');
    });
  });

  describe('importWords', () => {
    it('should successfully import multiple words', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        })
      };

      const mockInsertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'word-123',
            word: 'word1',
            type: 'chat',
            created_by: 'admin-123',
            created_at: '2024-01-01T12:00:00Z'
          },
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);
      mockSupabaseFrom.mockReturnValue(mockInsertChain as any);

      const wordsText = 'word1\nword2\nword3';
      const result = await profanityService.importWords(wordsText, 'chat', 'admin-123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Imported 3 words successfully');
    });

    it('should handle empty import text', async () => {
      const result = await profanityService.importWords('   \n  \n  ', 'chat', 'admin-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('No valid words found to import');
    });
  });

  describe('exportWords', () => {
    it('should export words to text format', async () => {
      const mockWords = [
        {
          id: 'word-1',
          word: 'badword1',
          type: 'chat',
          created_by: 'admin-123',
          created_at: '2024-01-01T12:00:00Z'
        },
        {
          id: 'word-2',
          word: 'badword2',
          type: 'chat',
          created_by: 'admin-123',
          created_at: '2024-01-01T11:00:00Z'
        }
      ];

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockWords,
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await profanityService.exportWords('chat');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Exported 2 words');
      expect(result.data.wordsText).toBe('badword1\nbadword2');
      expect(result.data.count).toBe(2);
    });
  });

  describe('getStatistics', () => {
    it('should return profanity statistics', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis()
      };

      // Mock different counts for different queries
      mockSelectChain.select.mockResolvedValue({ count: 10, error: null });

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await profanityService.getStatistics();

      expect(result.totalWords).toBe(10);
      expect(result.nicknameWords).toBe(10);
      expect(result.chatWords).toBe(10);
      expect(result.recentlyAdded).toBe(10);
    });

    it('should handle database errors gracefully', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis()
      };

      mockSelectChain.select.mockResolvedValue({ count: null, error: { message: 'Database error' } });

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);

      const result = await profanityService.getStatistics();

      expect(result).toEqual({
        totalWords: 0,
        nicknameWords: 0,
        chatWords: 0,
        recentlyAdded: 0
      });
    });
  });

  describe('clearWords', () => {
    it('should successfully clear all words of a type', async () => {
      const mockDeleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabaseFrom.mockReturnValue(mockDeleteChain as any);

      const result = await profanityService.clearWords('chat', 'admin-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('All chat profanity words cleared');
      expect(mockDeleteChain.eq).toHaveBeenCalledWith('type', 'chat');
    });

    it('should handle database errors when clearing', async () => {
      const mockDeleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'Database error' } })
      };

      mockSupabaseFrom.mockReturnValue(mockDeleteChain as any);

      const result = await profanityService.clearWords('chat', 'admin-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Database error');
    });
  });

  describe('testProfanityDetection', () => {
    beforeEach(async () => {
      // Mock cache update
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ word: 'badword' }],
          error: null
        })
      };

      mockSupabaseFrom.mockReturnValue(mockSelectChain as any);
      
      // Initialize cache
      await profanityService.initializeCache();
    });

    it('should test profanity detection with sample text', async () => {
      const result = await profanityService.testProfanityDetection('This is a badword test', 'chat');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Profanity test completed for chat');
      expect(result.data.originalText).toBe('This is a badword test');
      expect(result.data.result.isClean).toBe(false);
      expect(result.data.result.blockedWords).toContain('badword');
    });

    it('should test with clean text', async () => {
      const result = await profanityService.testProfanityDetection('This is clean text', 'chat');

      expect(result.success).toBe(true);
      expect(result.data.result.isClean).toBe(true);
      expect(result.data.result.blockedWords).toEqual([]);
    });
  });
});