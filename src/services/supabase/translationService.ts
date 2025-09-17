// Translation service remains the same as it uses external APIs
// This is just a wrapper to maintain the same interface

import { createServiceLogger } from "../../utils/logger";

const logger = createServiceLogger('TranslationService');

export interface TranslationResponse {
  translatedText: string;
  detectedLanguage: string;
  targetLanguage: string;
  confidence: number;
}

class TranslationService {
  private readonly SUPPORTED_LANGUAGES = {
    'auto': 'Auto-detect',
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'tr': 'Turkish',
    'nl': 'Dutch',
    'pl': 'Polish',
    'sv': 'Swedish',
    'da': 'Danish',
    'no': 'Norwegian',
    'fi': 'Finnish'
  };

  private cache: Map<string, string> = new Map();

  /**
   * Translate text using Google Translate API
   */
  async translateText(text: string, targetLang: string, sourceLang: string = 'auto'): Promise<string> {
    if (!text.trim()) return text;
    
    // Check cache first
    const cacheKey = `${text}_${sourceLang}_${targetLang}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Using a free translation API (MyMemory)
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.responseStatus === 200) {
        const translatedText = data.responseData.translatedText;
        
        // Cache the result
        this.cache.set(cacheKey, translatedText);
        
        // Limit cache size to prevent memory issues
        if (this.cache.size > 1000) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
        
        return translatedText;
      } else {
        throw new Error('Translation failed');
      }
    } catch (error) {
      logger.error('Translation error:', error);
      return text; // Return original text if translation fails
    }
  }

  /**
   * Detect language of text
   */
  async detectLanguage(text: string): Promise<string> {
    if (!text.trim()) return 'unknown';

    try {
      // Simple language detection based on character patterns
      // This is a basic implementation - in production you'd use a proper language detection service
      
      // Check for common patterns
      if (/[\u3040-\u309F]/.test(text)) return 'ja'; // Hiragana
      if (/[\u30A0-\u30FF]/.test(text)) return 'ja'; // Katakana
      if (/[\u4E00-\u9FAF]/.test(text)) return 'zh'; // Chinese characters
      if (/[\u0400-\u04FF]/.test(text)) return 'ru'; // Cyrillic
      if (/[\u0600-\u06FF]/.test(text)) return 'ar'; // Arabic
      if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Hindi
      if (/[\uAC00-\uD7AF]/.test(text)) return 'ko'; // Korean
      
      // For Latin-based languages, use MyMemory detection
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|en`;
      const response = await fetch(url);
      const data = await response.json();
      
      return data.responseData?.detectedSourceLanguage || 'en';
    } catch (error) {
      logger.error('Language detection error:', error);
      return 'en'; // Default to English
    }
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): { [key: string]: string } {
    return this.SUPPORTED_LANGUAGES;
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(langCode: string): boolean {
    return langCode in this.SUPPORTED_LANGUAGES;
  }

  /**
   * Get language name from code
   */
  getLanguageName(langCode: string): string {
    return this.SUPPORTED_LANGUAGES[langCode as keyof typeof this.SUPPORTED_LANGUAGES] || langCode;
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Get user's preferred language (stored in localStorage)
   */
  getUserPreferredLanguage(): string {
    try {
      return localStorage.getItem('preferredLanguage') || 'en';
    } catch {
      return 'en';
    }
  }

  /**
   * Set user's preferred language
   */
  setUserPreferredLanguage(langCode: string): void {
    try {
      if (this.isLanguageSupported(langCode)) {
        localStorage.setItem('preferredLanguage', langCode);
      }
    } catch (error) {
      logger.warn('Could not save preferred language:', error);
    }
  }

  /**
   * Check if translation should be shown based on user preferences
   */
  shouldShowTranslation(text: string, detectedLang?: string): boolean {
    const userLang = this.getUserPreferredLanguage();
    const detected = detectedLang || 'en';
    
    // Don't show translation if text is too short
    if (!text || text.trim().length < 10) {
      return false;
    }
    
    // Don't show if detected language matches user's preferred language
    if (detected === userLang) {
      return false;
    }
    
    return true;
  }

  /**
   * Alias for shouldShowTranslation (for compatibility)
   */
  shouldTranslate(text: string, userLang?: string): boolean {
    return this.shouldShowTranslation(text, userLang);
  }
}

export const translationService = new TranslationService();