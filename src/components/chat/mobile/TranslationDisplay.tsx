import { Show } from 'solid-js';
import { FiGlobe, FiInfo } from 'solid-icons/fi';
import type { TranslationResponse } from '../../../services/supabase';

interface TranslationDisplayProps {
  translation: TranslationResponse | null;
  originalText: string;
  isVisible: boolean;
  className?: string;
}

export default function TranslationDisplay(props: TranslationDisplayProps) {
  const getLanguageName = (code: string): string => {
    const languages: { [key: string]: string } = {
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
      'nl': 'Dutch',
      'sv': 'Swedish',
      'da': 'Danish',
      'no': 'Norwegian',
      'fi': 'Finnish',
      'pl': 'Polish',
      'tr': 'Turkish',
      'he': 'Hebrew',
      'auto': 'Auto-detected',
      'unknown': 'Unknown'
    };
    return languages[code] || code.toUpperCase();
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getConfidenceText = (confidence: number): string => {
    if (confidence >= 0.8) return 'High confidence';
    if (confidence >= 0.5) return 'Medium confidence';
    return 'Low confidence';
  };

  return (
    <Show when={props.translation && props.isVisible}>
      <div class={`
        mt-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 
        rounded-lg text-sm transition-all duration-200
        ${props.className || ''}
      `}>
        {/* Translation Header */}
        <div class="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
          <FiGlobe class="w-3 h-3" />
          <span class="font-medium">Translation</span>
          <Show when={props.translation?.detectedLanguage && props.translation.detectedLanguage !== 'auto'}>
            <span class="text-xs opacity-75">
              {getLanguageName(props.translation!.detectedLanguage)} → {getLanguageName(props.translation!.targetLanguage)}
            </span>
          </Show>
        </div>

        {/* Translated Text */}
        <div class="text-neutral-800 dark:text-neutral-200 leading-relaxed mb-2">
          {props.translation?.translatedText}
        </div>

        {/* Translation Info */}
        <div class="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <div class="flex items-center gap-3">
            <Show when={props.translation?.confidence !== undefined && props.translation.confidence > 0}>
              <div class="flex items-center gap-1">
                <FiInfo class="w-3 h-3" />
                <span class={getConfidenceColor(props.translation!.confidence)}>
                  {getConfidenceText(props.translation!.confidence)}
                </span>
              </div>
            </Show>
            
            <Show when={props.translation?.detectedLanguage && props.translation.detectedLanguage !== 'auto'}>
              <span>
                Detected: {getLanguageName(props.translation!.detectedLanguage)}
              </span>
            </Show>
          </div>

          <span class="opacity-75">
            Powered by MyMemory
          </span>
        </div>

        {/* Original Text (when showing translation) */}
        <Show when={props.originalText !== props.translation?.translatedText}>
          <div class="mt-3 pt-2 border-t border-blue-200 dark:border-blue-800">
            <div class="text-xs text-blue-600 dark:text-blue-400 mb-1 font-medium">
              Original:
            </div>
            <div class="text-xs text-neutral-600 dark:text-neutral-400 opacity-75">
              {props.originalText}
            </div>
          </div>
        </Show>
      </div>
    </Show>
  );
}