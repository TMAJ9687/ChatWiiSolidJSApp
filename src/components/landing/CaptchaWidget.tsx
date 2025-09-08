import { Component, createSignal, onMount, onCleanup } from "solid-js";
import { recaptchaService } from "../../services/captcha/recaptchaService";

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
    
    // Skip CAPTCHA in localhost development
    if (isLocalhost) {
      console.log('reCAPTCHA: Disabled for localhost development');
      // Auto-verify for localhost
      setTimeout(() => {
        props.onVerify('localhost-dev-bypass');
        setIsLoaded(true);
      }, 100);
      return;
    }
    
    if (!siteKey || siteKey === 'your_recaptcha_site_key_here') {
      console.warn('reCAPTCHA: Site key not configured');
      setHasError(true);
      return;
    }

    try {
      await recaptchaService.init(siteKey);
      
      const success = await recaptchaService.render(
        'recaptcha-widget',
        {
          onSuccess: (token: string) => {
            props.onVerify(token);
          },
          onExpired: () => {
            props.onExpired();
          },
          onError: () => {
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
        setIsLoaded(true);
      } else {
        setHasError(true);
      }
    } catch (error) {
      setHasError(true);
      props.onError();
    }
  });

  onCleanup(() => {
    recaptchaService.cleanup();
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
          id="recaptcha-widget" 
          class={`transition-opacity duration-300 ${
            isLoaded() ? 'opacity-100' : 'opacity-50'
          }`}
        />
      )}
    </div>
  );
};

export default CaptchaWidget;