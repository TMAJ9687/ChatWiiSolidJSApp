import { supabase } from "../../config/supabase";
import type { AdminActionResult } from "../../types/admin.types";

export interface ProfanityWord {
  id: string;
  word: string;
  type: 'nickname' | 'chat';
  createdBy: string;
  createdAt: string;
}

export interface ProfanityCheckResult {
  isClean: boolean;
  blockedWords: string[];
  cleanedText?: string;
}

class ProfanityService {
  // In-memory cache for better performance
  private nicknameWordsCache: Set<string> = new Set();
  private chatWordsCache: Set<string> = new Set();
  private cacheLastUpdated: { nickname: number; chat: number } = { nickname: 0, chat: 0 };
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Add a profanity word
  async addWord(
    word: string,
    type: 'nickname' | 'chat',
    adminId: string
  ): Promise<AdminActionResult> {
    try {
      // Normalize the word (lowercase, trim)
      const normalizedWord = word.toLowerCase().trim();
      
      if (!normalizedWord) {
        return {
          success: false,
          message: 'Word cannot be empty'
        };
      }

      // Check if word already exists
      const existingWord = await this.getWordByValue(normalizedWord, type);
      if (existingWord) {
        return {
          success: false,
          message: `Word "${normalizedWord}" already exists in ${type} filter`
        };
      }

      const { data, error } = await supabase
        .from("profanity_words")
        .insert({
          word: normalizedWord,
          type,
          created_by: adminId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Update cache
      this.addToCache(normalizedWord, type);

      return {
        success: true,
        message: `Word "${normalizedWord}" added to ${type} filter`,
        data: this.convertToProfanityWord(data)
      };
    } catch (error) {
      console.error("Error adding profanity word:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add word'
      };
    }
  }

  // Remove a profanity word
  async removeWord(wordId: string, adminId?: string): Promise<AdminActionResult> {
    try {
      // Get word details before deletion
      const { data: wordData } = await supabase
        .from("profanity_words")
        .select("word, type")
        .eq("id", wordId)
        .single();

      const { error } = await supabase
        .from("profanity_words")
        .delete()
        .eq("id", wordId);

      if (error) {
        throw new Error(error.message);
      }

      // Update cache
      if (wordData) {
        this.removeFromCache(wordData.word, wordData.type);
      }

      return {
        success: true,
        message: `Word removed from ${wordData?.type || 'profanity'} filter`,
        data: { id: wordId, word: wordData?.word, type: wordData?.type }
      };
    } catch (error) {
      console.error("Error removing profanity word:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to remove word'
      };
    }
  }

  // Get all words of a specific type
  async getWords(type?: 'nickname' | 'chat'): Promise<ProfanityWord[]> {
    try {
      let query = supabase
        .from("profanity_words")
        .select("*")
        .order("created_at", { ascending: false });

      if (type) {
        query = query.eq("type", type);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error getting profanity words:", error);
        return [];
      }

      return (data || []).map(this.convertToProfanityWord);
    } catch (error) {
      console.error("Error getting profanity words:", error);
      return [];
    }
  }

  // Check if text contains profanity
  async checkText(text: string, type: 'nickname' | 'chat'): Promise<ProfanityCheckResult> {
    try {
      if (!text || typeof text !== 'string') {
        return { isClean: true, blockedWords: [] };
      }

      // Ensure cache is up to date
      await this.ensureCacheUpdated(type);

      const normalizedText = text.toLowerCase();
      const wordsToCheck = type === 'nickname' ? this.nicknameWordsCache : this.chatWordsCache;
      const blockedWords: string[] = [];

      // Check for blocked words
      for (const blockedWord of wordsToCheck) {
        if (normalizedText.includes(blockedWord)) {
          blockedWords.push(blockedWord);
        }
      }

      const isClean = blockedWords.length === 0;

      return {
        isClean,
        blockedWords,
        cleanedText: isClean ? text : this.cleanText(text, blockedWords)
      };
    } catch (error) {
      console.error("Error checking text for profanity:", error);
      // Return as clean on error to avoid blocking legitimate content
      return { isClean: true, blockedWords: [] };
    }
  }

  // Bulk check multiple texts
  async checkMultipleTexts(
    texts: string[],
    type: 'nickname' | 'chat'
  ): Promise<ProfanityCheckResult[]> {
    const results: ProfanityCheckResult[] = [];
    
    for (const text of texts) {
      const result = await this.checkText(text, type);
      results.push(result);
    }
    
    return results;
  }

  // Add multiple words at once
  async addMultipleWords(
    words: string[],
    type: 'nickname' | 'chat',
    adminId: string
  ): Promise<AdminActionResult[]> {
    const results: AdminActionResult[] = [];
    
    for (const word of words) {
      const result = await this.addWord(word, type, adminId);
      results.push(result);
    }
    
    return results;
  }

  // Import words from text (one word per line)
  async importWords(
    wordsText: string,
    type: 'nickname' | 'chat',
    adminId: string
  ): Promise<AdminActionResult> {
    try {
      const words = wordsText
        .split('\n')
        .map(word => word.trim().toLowerCase())
        .filter(word => word.length > 0);

      if (words.length === 0) {
        return {
          success: false,
          message: 'No valid words found to import'
        };
      }

      const results = await this.addMultipleWords(words, type, adminId);
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      return {
        success: successCount > 0,
        message: `Imported ${successCount} words successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
        data: { successCount, failureCount, results }
      };
    } catch (error) {
      console.error("Error importing words:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to import words'
      };
    }
  }

  // Export words to text format
  async exportWords(type?: 'nickname' | 'chat'): Promise<AdminActionResult> {
    try {
      const words = await this.getWords(type);
      const wordsText = words.map(w => w.word).join('\n');

      return {
        success: true,
        message: `Exported ${words.length} words`,
        data: {
          wordsText,
          count: words.length,
          type: type || 'all'
        }
      };
    } catch (error) {
      console.error("Error exporting words:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to export words'
      };
    }
  }

  // Get profanity statistics
  async getStatistics(): Promise<{
    totalWords: number;
    nicknameWords: number;
    chatWords: number;
    recentlyAdded: number; // Added in last 7 days
  }> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [totalResult, nicknameResult, chatResult, recentResult] = await Promise.all([
        supabase.from("profanity_words").select("*", { count: "exact", head: true }),
        supabase.from("profanity_words").select("*", { count: "exact", head: true }).eq("type", "nickname"),
        supabase.from("profanity_words").select("*", { count: "exact", head: true }).eq("type", "chat"),
        supabase.from("profanity_words").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo)
      ]);

      return {
        totalWords: totalResult.count || 0,
        nicknameWords: nicknameResult.count || 0,
        chatWords: chatResult.count || 0,
        recentlyAdded: recentResult.count || 0
      };
    } catch (error) {
      console.error("Error getting profanity statistics:", error);
      return {
        totalWords: 0,
        nicknameWords: 0,
        chatWords: 0,
        recentlyAdded: 0
      };
    }
  }

  // Clear all words of a specific type
  async clearWords(type: 'nickname' | 'chat', adminId: string): Promise<AdminActionResult> {
    try {
      const { error } = await supabase
        .from("profanity_words")
        .delete()
        .eq("type", type);

      if (error) {
        throw new Error(error.message);
      }

      // Clear cache
      if (type === 'nickname') {
        this.nicknameWordsCache.clear();
        this.cacheLastUpdated.nickname = 0;
      } else {
        this.chatWordsCache.clear();
        this.cacheLastUpdated.chat = 0;
      }

      return {
        success: true,
        message: `All ${type} profanity words cleared`
      };
    } catch (error) {
      console.error(`Error clearing ${type} words:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : `Failed to clear ${type} words`
      };
    }
  }

  // Private helper methods
  private async getWordByValue(word: string, type: 'nickname' | 'chat'): Promise<ProfanityWord | null> {
    try {
      const { data, error } = await supabase
        .from("profanity_words")
        .select("*")
        .eq("word", word)
        .eq("type", type)
        .single();

      if (error || !data) {
        return null;
      }

      return this.convertToProfanityWord(data);
    } catch (error) {
      return null;
    }
  }

  private async ensureCacheUpdated(type: 'nickname' | 'chat'): Promise<void> {
    const now = Date.now();
    const lastUpdated = this.cacheLastUpdated[type];
    
    if (now - lastUpdated > this.CACHE_DURATION) {
      await this.updateCache(type);
    }
  }

  private async updateCache(type: 'nickname' | 'chat'): Promise<void> {
    try {
      const { data, error } = await supabase
        .from("profanity_words")
        .select("word")
        .eq("type", type);

      if (error) {
        console.error(`Error updating ${type} cache:`, error);
        return;
      }

      const cache = type === 'nickname' ? this.nicknameWordsCache : this.chatWordsCache;
      cache.clear();
      
      if (data) {
        for (const row of data) {
          cache.add(row.word);
        }
      }

      this.cacheLastUpdated[type] = Date.now();
    } catch (error) {
      console.error(`Error updating ${type} cache:`, error);
    }
  }

  private addToCache(word: string, type: 'nickname' | 'chat'): void {
    const cache = type === 'nickname' ? this.nicknameWordsCache : this.chatWordsCache;
    cache.add(word);
  }

  private removeFromCache(word: string, type: 'nickname' | 'chat'): void {
    const cache = type === 'nickname' ? this.nicknameWordsCache : this.chatWordsCache;
    cache.delete(word);
  }

  private cleanText(text: string, blockedWords: string[]): string {
    let cleanedText = text;
    
    for (const blockedWord of blockedWords) {
      const regex = new RegExp(blockedWord, 'gi');
      const replacement = '*'.repeat(blockedWord.length);
      cleanedText = cleanedText.replace(regex, replacement);
    }
    
    return cleanedText;
  }

  private convertToProfanityWord(data: any): ProfanityWord {
    return {
      id: data.id,
      word: data.word,
      type: data.type,
      createdBy: data.created_by,
      createdAt: data.created_at
    };
  }

  // Initialize cache on service startup
  async initializeCache(): Promise<void> {
    await Promise.all([
      this.updateCache('nickname'),
      this.updateCache('chat')
    ]);
  }

  // Test profanity detection with sample text
  async testProfanityDetection(
    sampleText: string,
    type: 'nickname' | 'chat'
  ): Promise<AdminActionResult> {
    try {
      const result = await this.checkText(sampleText, type);
      
      return {
        success: true,
        message: `Profanity test completed for ${type}`,
        data: {
          originalText: sampleText,
          result
        }
      };
    } catch (error) {
      console.error("Error testing profanity detection:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to test profanity detection'
      };
    }
  }
}

export const profanityService = new ProfanityService();