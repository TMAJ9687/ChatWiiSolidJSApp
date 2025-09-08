import { Component, createSignal, Show } from 'solid-js';
import { FiEye, FiEyeOff } from 'solid-icons/fi';

interface ImagePreviewProps {
  imageUrl: string;
  imageId: string;
  onImageClick: () => void;
  isFromCurrentUser?: boolean;
}

const ImagePreview: Component<ImagePreviewProps> = (props) => {
  const [isRevealed, setIsRevealed] = createSignal(false);

  const handleRevealToggle = (e: Event) => {
    e.stopPropagation();
    setIsRevealed(!isRevealed());
  };

  const handleImageClick = () => {
    props.onImageClick();
  };

  const getBlurClass = () => {
    return isRevealed() ? '' : 'blur-md';
  };

  const getButtonColor = () => {
    return props.isFromCurrentUser 
      ? 'bg-secondary-500 hover:bg-secondary-600' 
      : 'bg-primary-500 hover:bg-primary-600';
  };

  return (
    <div class="relative w-[300px] h-[300px] bg-neutral-100 dark:bg-neutral-700 rounded-lg overflow-hidden group">
      {/* Image */}
      <img
        src={props.imageUrl}
        alt="Shared image"
        class={`w-full h-full object-cover cursor-pointer transition-all duration-300 ${getBlurClass()}`}
        onClick={handleImageClick}
        onError={(e) => {
          // Fallback in case image fails to load
          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNTAgMTAwQzE0MS43MTYgMTAwIDEzNSAxMDYuNzE2IDEzNSAxMTVDMTM1IDEyMy4yODQgMTQxLjcxNiAxMzAgMTUwIDEzMEMxNTguMjg0IDEzMCAxNjUgMTIzLjI4NCAxNjUgMTE1QzE2NSAxMDYuNzE2IDE1OC4yODQgMTAwIDE1MCAxMDBaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0xMjAgMTgwTDE4MCAyMDBMMjAwIDE1MEwxMjAgMTgwWiIgZmlsbD0iIzlCOUJBMCIvPgo8L3N2Zz4K';
        }}
      />

      {/* Overlay with reveal/revert button */}
      <div class={`absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity duration-300 ${
        isRevealed() ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
      }`}>
        <button
          onClick={handleRevealToggle}
          class={`px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 transform hover:scale-105 ${getButtonColor()}`}
        >
          <div class="flex items-center gap-2">
            <Show when={!isRevealed()} fallback={<FiEyeOff class="w-4 h-4" />}>
              <FiEye class="w-4 h-4" />
            </Show>
            {isRevealed() ? 'Revert' : 'Reveal'}
          </div>
        </button>
      </div>

      {/* Click hint when revealed */}
      <Show when={isRevealed()}>
        <div class="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          Click to view full size
        </div>
      </Show>

      {/* Loading state overlay (if needed) */}
      <div class="absolute inset-0 bg-neutral-200 dark:bg-neutral-600 flex items-center justify-center opacity-0 transition-opacity duration-300" id={`loading-${props.imageId}`}>
        <div class="w-8 h-8 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  );
};

export default ImagePreview;