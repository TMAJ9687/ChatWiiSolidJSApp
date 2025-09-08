import { createSignal, Show } from 'solid-js';
import { FiEye, FiEyeOff } from 'solid-icons/fi';

interface BlurredImageMessageProps {
  imageUrl: string;
  onImageClick: () => void;
  className?: string;
}

export default function BlurredImageMessage(props: BlurredImageMessageProps) {
  const [isRevealed, setIsRevealed] = createSignal(false);
  const [imageLoaded, setImageLoaded] = createSignal(false);

  const toggleReveal = (e: Event) => {
    e.stopPropagation();
    setIsRevealed(!isRevealed());
  };

  const handleImageClick = (e: Event) => {
    e.stopPropagation();
    if (isRevealed()) {
      props.onImageClick();
    }
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  return (
    <div class={`relative ${props.className || ''}`}>
      {/* 300x300 container */}
      <div class="relative w-[150px] h-[150px] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
        {/* Image */}
        <img
          src={props.imageUrl}
          alt="Shared image"
          class={`
            w-full h-full object-cover cursor-pointer transition-all duration-300
            ${isRevealed() ? 'blur-none' : 'blur-[12px]'}
            ${imageLoaded() ? 'opacity-100' : 'opacity-0'}
          `}
          onClick={handleImageClick}
          onLoad={handleImageLoad}
        />

        {/* Loading state */}
        <Show when={!imageLoaded()}>
          <div class="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-600">
            <div class="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </Show>

        {/* Blur overlay with icon (when blurred) */}
        <Show when={!isRevealed() && imageLoaded()}>
          <div class="absolute inset-0 flex items-center justify-center bg-black/20">
            <div class="bg-black/50 rounded-full p-3">
              <FiEye class="w-6 h-6 text-white" />
            </div>
          </div>
        </Show>

        {/* Control buttons */}
        <Show when={imageLoaded()}>
          <div class="absolute top-2 right-2">
            <button
              onClick={toggleReveal}
              class={`
                p-2 rounded-full transition-all duration-200 shadow-lg
                ${isRevealed() 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
                }
              `}
              title={isRevealed() ? 'Hide image' : 'Reveal image'}
            >
              {isRevealed() ? (
                <FiEyeOff class="w-4 h-4" />
              ) : (
                <FiEye class="w-4 h-4" />
              )}
            </button>
          </div>
        </Show>

        {/* Click hint when revealed */}
        <Show when={isRevealed() && imageLoaded()}>
          <div class="absolute bottom-2 left-2 right-2">
            <div class="bg-black/70 rounded-md px-2 py-1 text-center">
              <span class="text-white text-xs">Click to view full size</span>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}