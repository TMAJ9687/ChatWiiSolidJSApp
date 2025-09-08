import { Component, createSignal, onMount, onCleanup } from "solid-js";
import { turnstileService } from "../../services/captcha/turnstileService";

interface CaptchaWidgetProps {
  onVerify: (token: string) => void;
  onExpired: () => void;
  onError: () => void;
  theme?: 'light' | 'dark';
}

const CaptchaWidget: Component<CaptchaWidgetProps> = (props) => {
  const [isLoaded, setIsLoaded] = createSignal(false);
  const [hasError, setHasError] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string>('');
  const [showFallback, setShowFallback] = createSignal(false);
  
  onMount(async () => {
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // Initialize CAPTCHA widget
    
    // Skip CAPTCHA in localhost development only
    if (isLocalhost) {
      console.log('Turnstile: Bypassed for localhost development');
      // Auto-verify with bypass token for development
      setTimeout(() => {
        props.onVerify('turnstile-bypass-dev-' + Date.now());
        setIsLoaded(true);
      }, 100);
      return;
    }
    
    if (!siteKey || siteKey === 'your_recaptcha_site_key_here') {
      setErrorMessage('CAPTCHA not configured. Please contact support.');
      setHasError(true);
      return;
    }

    try {
      await turnstileService.init(siteKey);
      const success = await turnstileService.render(
        'turnstile-widget',
        {
          onSuccess: (token: string) => {
            props.onVerify(token);
            setIsLoaded(true);
          },
          onExpired: () => {
            props.onExpired();
            setErrorMessage('CAPTCHA expired. Please refresh the page.');
            setHasError(true);
          },
          onError: () => {
            setErrorMessage('CAPTCHA failed to load. Please check your internet connection and try again.');
            setHasError(true);
            // Show fallback option after 5 seconds
            setTimeout(() => {
              setShowFallback(true);
            }, 5000);
            props.onError();
          }
        },
        {
          theme: props.theme || 'light',
          size: 'normal'
        }
      );
      
      if (!success) {
        setErrorMessage('CAPTCHA widget failed to initialize. Please refresh the page.');
        setHasError(true);
        // Show fallback option after 5 seconds
        setTimeout(() => {
          setShowFallback(true);
        }, 5000);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown CAPTCHA error';
      setErrorMessage(`CAPTCHA error: ${errorMsg}`);
      setHasError(true);
      // Show fallback option after 5 seconds
      setTimeout(() => {
        setShowFallback(true);
      }, 5000);
      props.onError();
    }
  });

  onCleanup(() => {
    turnstileService.cleanup();
  });

  const isLocalhost = () => window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const handleFallbackSkip = () => {
    // Generate a fallback token indicating CAPTCHA was skipped due to technical issues
    props.onVerify('captcha-fallback-' + Date.now());
    setIsLoaded(true);
    setShowFallback(false);
  };

  return (
    <div class="w-full flex justify-center">
      {isLoaded() ? (
        <div class="text-sm text-green-600 dark:text-green-400 text-center bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
          ✓ CAPTCHA verification completed
        </div>
      ) : hasError() ? (
        <div class="space-y-3">
          <div class="text-sm text-red-500 dark:text-red-400 text-center bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
            {errorMessage() || 'CAPTCHA unavailable. Please try again later.'}
          </div>
          {showFallback() && (
            <div class="text-center">
              <p class="text-xs text-text-600 dark:text-text-400 mb-2">
                Having trouble with CAPTCHA?
              </p>
              <button
                onClick={handleFallbackSkip}
                class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg font-medium transition-colors"
              >
                Skip CAPTCHA (Technical Issues)
              </button>
            </div>
          )}
        </div>
      ) : (
        <div 
          id="turnstile-widget" 
          class={`transition-opacity duration-300 ${
            isLoaded() ? 'opacity-100' : 'opacity-50'
          }`}
        />
      )}
    </div>
  );
};

export default CaptchaWidget;