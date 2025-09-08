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
  
  onMount(async () => {
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    console.log('CaptchaWidget: Starting initialization');
    console.log('CaptchaWidget: Site key:', siteKey);
    console.log('CaptchaWidget: Is localhost:', isLocalhost);
    
    // Skip CAPTCHA in localhost development
    if (isLocalhost) {
      console.log('Turnstile: Disabled for localhost development');
      // Auto-verify for localhost
      setTimeout(() => {
        props.onVerify('localhost-dev-bypass');
        setIsLoaded(true);
      }, 100);
      return;
    }
    
    if (!siteKey || siteKey === 'your_recaptcha_site_key_here') {
      console.error('Turnstile: Site key not configured or is placeholder');
      setHasError(true);
      return;
    }

    try {
      console.log('CaptchaWidget: Initializing Turnstile service');
      await turnstileService.init(siteKey);
      
      console.log('CaptchaWidget: Rendering widget');
      const success = await turnstileService.render(
        'turnstile-widget',
        {
          onSuccess: (token: string) => {
            console.log('Turnstile: Success callback called');
            props.onVerify(token);
          },
          onExpired: () => {
            console.log('Turnstile: Expired callback called');
            props.onExpired();
          },
          onError: () => {
            console.error('Turnstile: Error callback called');
            setHasError(true);
            props.onError();
          }
        },
        {
          theme: props.theme || 'light',
          size: 'normal'
        }
      );
      
      if (success) {
        console.log('CaptchaWidget: Widget rendered successfully');
        setIsLoaded(true);
      } else {
        console.error('CaptchaWidget: Widget rendering failed');
        setHasError(true);
      }
    } catch (error) {
      console.error('CaptchaWidget: Initialization error:', error);
      setHasError(true);
      props.onError();
    }
  });

  onCleanup(() => {
    turnstileService.cleanup();
  });

  const isLocalhost = () => window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  return (
    <div class="w-full flex justify-center">
      {isLocalhost() && isLoaded() ? (
        <div class="text-sm text-green-600 dark:text-green-400 text-center bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
          ✓ CAPTCHA bypassed for development
        </div>
      ) : hasError() ? (
        <div class="text-sm text-red-500 dark:text-red-400 text-center">
          CAPTCHA unavailable. Please try again later.
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