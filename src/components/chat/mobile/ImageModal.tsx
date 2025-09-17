import { Component, createSignal, onMount, onCleanup, Show } from 'solid-js';
import { FiX, FiZoomIn, FiZoomOut, FiRotateCw, FiDownload } from 'solid-icons/fi';
import { createServiceLogger } from '../../../utils/logger';

const logger = createServiceLogger('ImageModal');

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  imageAlt?: string;
}

const ImageModal: Component<ImageModalProps> = (props) => {
  const [scale, setScale] = createSignal(1);
  const [rotation, setRotation] = createSignal(0);
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = createSignal(false);
  const [dragStart, setDragStart] = createSignal({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = createSignal(false);

  let modalRef: HTMLDivElement | undefined;
  let imageRef: HTMLImageElement | undefined;

  // Reset values when modal opens
  const resetImageState = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setImageLoaded(false);
  };

  // Handle keyboard events
  const handleKeydown = (e: KeyboardEvent) => {
    if (!props.isOpen) return;

    switch (e.key) {
      case 'Escape':
        props.onClose();
        break;
      case '+':
      case '=':
        handleZoomIn();
        break;
      case '-':
        handleZoomOut();
        break;
      case 'r':
      case 'R':
        handleRotate();
        break;
    }
  };

  // Handle mouse wheel for zooming
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  // Zoom functions
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  // Download image
  const handleDownload = async () => {
    try {
      const response = await fetch(props.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chatwii-image-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Failed to download image:', error);
    }
  };

  // Drag functionality
  const handleMouseDown = (e: MouseEvent) => {
    if (e.target !== imageRef) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position().x, y: e.clientY - position().y });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging()) return;
    setPosition({
      x: e.clientX - dragStart().x,
      y: e.clientY - dragStart().y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle backdrop click
  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === modalRef) {
      props.onClose();
    }
  };

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  });

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeydown);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  });

  // Reset when modal opens/closes
  const isOpenEffect = () => {
    if (props.isOpen) {
      resetImageState();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  };

  isOpenEffect();

  return (
    <Show when={props.isOpen}>
      <div
        ref={modalRef}
        class="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center"
        onClick={handleBackdropClick}
        onWheel={handleWheel}
      >
        {/* Header Controls */}
        <div class="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <div class="flex items-center gap-2">
            {/* Zoom Controls */}
            <button
              onClick={handleZoomOut}
              class="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
              title="Zoom Out (-)"
            >
              <FiZoomOut class="w-5 h-5" />
            </button>
            <span class="text-white text-sm bg-black/50 px-2 py-1 rounded">
              {Math.round(scale() * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              class="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
              title="Zoom In (+)"
            >
              <FiZoomIn class="w-5 h-5" />
            </button>

            {/* Rotate */}
            <button
              onClick={handleRotate}
              class="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
              title="Rotate (R)"
            >
              <FiRotateCw class="w-5 h-5" />
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              class="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
              title="Download Image"
            >
              <FiDownload class="w-5 h-5" />
            </button>

            {/* Reset */}
            <button
              onClick={handleReset}
              class="px-3 py-2 bg-black/50 hover:bg-black/70 text-white text-sm rounded-lg transition-colors"
              title="Reset View"
            >
              Reset
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={props.onClose}
            class="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
            title="Close (Esc)"
          >
            <FiX class="w-6 h-6" />
          </button>
        </div>

        {/* Image Container */}
        <div class="relative w-full h-full flex items-center justify-center overflow-hidden">
          {/* Loading State */}
          <Show when={!imageLoaded()}>
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          </Show>

          {/* Image */}
          <img
            ref={imageRef}
            src={props.imageUrl}
            alt={props.imageAlt || 'Full size image'}
            class={`max-w-[90vw] max-h-[80vh] w-auto h-auto transition-all duration-200 ease-out select-none ${
              isDragging() ? 'cursor-grabbing' : scale() > 1 ? 'cursor-grab' : 'cursor-default'
            }`}
            style={{
              transform: `translate(${position().x}px, ${position().y}px) scale(${scale()}) rotate(${rotation()}deg)`,
              opacity: imageLoaded() ? '1' : '0'
            }}
            onLoad={() => setImageLoaded(true)}
            onMouseDown={handleMouseDown}
            draggable={false}
          />
        </div>

        {/* Instructions */}
        <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/70 text-sm text-center bg-black/30 px-4 py-2 rounded-lg">
          <p class="mb-1">Use mouse wheel or +/- to zoom • Drag to move • R to rotate</p>
          <p>Press ESC to close</p>
        </div>
      </div>
    </Show>
  );
};

export default ImageModal;