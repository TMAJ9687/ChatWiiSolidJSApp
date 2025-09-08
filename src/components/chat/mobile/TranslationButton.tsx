import { createSignal, Show } from 'solid-js';
import { FiGlobe, FiLoader } from 'solid-icons/fi';
import { translationService, type TranslationResponse } from '../../../services/supabase';

interface TranslationButtonProps {
  text: string;
  onTranslationToggle?: (translation: TranslationResponse | null) => void;
  className?: string;
  disabled?: boolean;
}

export default function TranslationButton(props: TranslationButtonProps) {
  const [isTranslating, setIsTranslating] = createSignal(false);
  const [translation, setTranslation] = createSignal<TranslationResponse | null>(null);
  const [showTranslation, setShowTranslation] = createSignal(false);

  const handleTranslate = async () => {
    if (isTranslating()) return;

    // If we already have translation, just toggle display
    if (translation()) {
      const newShowState = !showTranslation();
      setShowTranslation(newShowState);
      props.onTranslationToggle?.(newShowState ? translation() : null);
      return;
    }

    // Perform new translation
    setIsTranslating(true);
    try {
      const userLanguage = translationService.getUserPreferredLanguage();
      const result = await translationService.translateText(props.text, userLanguage);
      
      // Only show translation if it's actually different and confident
      if (result.translatedText !== props.text && result.confidence > 0.3) {
        setTranslation(result);
        setShowTranslation(true);
        props.onTranslationToggle?.(result);
      } else {
        // Translation not needed or low confidence
        setTranslation(null);
        setShowTranslation(false);
        props.onTranslationToggle?.(null);
      }
    } catch (error) {
      console.error('Translation failed:', error);
      setTranslation(null);
      setShowTranslation(false);
      props.onTranslationToggle?.(null);
    } finally {
      setIsTranslating(false);
    }
  };

  const getButtonTitle = () => {
    if (isTranslating()) return 'Translating...';
    if (translation() && showTranslation()) return 'Show original';
    if (translation() && !showTranslation()) return 'Show translation';
    return 'Translate message';
  };

  const shouldShowButton = () => {
    // Don't show for very short text
    if (!props.text || props.text.trim().length < 3) return false;
    
    // Don't show if disabled
    if (props.disabled) return false;
    
    // Check if translation is potentially useful
    return translationService.shouldTranslate(props.text, translationService.getUserPreferredLanguage());
  };

  return (
    <Show when={shouldShowButton()}>
      <button
        onClick={handleTranslate}
        disabled={isTranslating() || props.disabled}
        class={`
          p-1.5 rounded-lg transition-all duration-200
          ${showTranslation() 
            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' 
            : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400'
          }
          ${isTranslating() || props.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
          ${props.className || ''}
        `}
        title={getButtonTitle()}
      >
        <Show
          when={!isTranslating()}
          fallback={<FiLoader class="w-4 h-4 animate-spin" />}
        >
          <FiGlobe class="w-4 h-4" />
        </Show>
      </button>
    </Show>
  );
}