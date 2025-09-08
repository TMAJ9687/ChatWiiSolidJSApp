import { Component, createSignal, Show, onCleanup } from 'solid-js';
import { FiX, FiSend, FiImage } from 'solid-icons/fi';
import { imageService, type ImageUploadResult } from '../../../services/supabase';

interface ImageUploadProps {
  isOpen: boolean;
  selectedFile: File | null;
  onCancel: () => void;
  onSend: (imageResult: ImageUploadResult) => void;
  currentUserId: string;
  conversationId: string;
}

const ImageUpload: Component<ImageUploadProps> = (props) => {
  const [previewUrl, setPreviewUrl] = createSignal<string>('');
  const [uploading, setUploading] = createSignal(false);
  const [uploadProgress, setUploadProgress] = createSignal(0);
  const [error, setError] = createSignal<string>('');

  // Create preview URL when file changes
  const createPreview = (file: File) => {
    if (previewUrl()) {
      imageService.revokePreviewUrl(previewUrl());
    }
    const url = imageService.createPreviewUrl(file);
    setPreviewUrl(url);
  };

  // Create preview when file is selected
  const currentFile = () => props.selectedFile;
  
  // Watch for file changes
  const updatePreview = () => {
    const file = currentFile();
    if (file) {
      createPreview(file);
      setError('');
    }
  };

  // Update preview when file changes
  updatePreview();

  onCleanup(() => {
    if (previewUrl()) {
      imageService.revokePreviewUrl(previewUrl());
    }
  });

  const handleSend = async () => {
    const file = props.selectedFile;
    if (!file) return;

    setUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      const result = await imageService.uploadImage(
        file,
        props.currentUserId,
        props.conversationId,
        (progress) => setUploadProgress(progress)
      );

      props.onSend(result);
      handleCancel();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image';
      setError(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCancel = () => {
    if (previewUrl()) {
      imageService.revokePreviewUrl(previewUrl());
      setPreviewUrl('');
    }
    setError('');
    setUploading(false);
    setUploadProgress(0);
    props.onCancel();
  };

  const getFileSizeText = (file: File) => {
    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB < 1) {
      return `${Math.round(file.size / 1024)}KB`;
    }
    return `${sizeInMB.toFixed(1)}MB`;
  };

  return (
    <Show when={props.isOpen && props.selectedFile}>
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-neutral-800 rounded-xl max-w-md w-full p-6 shadow-xl">
          {/* Header */}
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-text-1000 dark:text-text-0 flex items-center gap-2">
              <FiImage class="w-5 h-5 text-secondary-500" />
              Send Image
            </h3>
            <button
              onClick={handleCancel}
              disabled={uploading()}
              class="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
            >
              <FiX class="w-5 h-5 text-text-600 dark:text-text-400" />
            </button>
          </div>

          {/* Image Preview */}
          <div class="mb-4">
            <div class="relative bg-neutral-100 dark:bg-neutral-700 rounded-lg overflow-hidden">
              <Show when={previewUrl()}>
                <img
                  src={previewUrl()}
                  alt="Preview"
                  class="w-full h-64 object-contain"
                />
              </Show>
              
              {/* Upload Progress Overlay */}
              <Show when={uploading()}>
                <div class="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div class="text-white text-center">
                    <div class="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-2 mx-auto"></div>
                    <p class="text-sm">Uploading... {uploadProgress()}%</p>
                  </div>
                </div>
              </Show>
            </div>

            {/* File Info */}
            <Show when={props.selectedFile}>
              <div class="mt-2 text-sm text-text-600 dark:text-text-400">
                <p class="truncate">{props.selectedFile?.name}</p>
                <p>{getFileSizeText(props.selectedFile!)}</p>
              </div>
            </Show>
          </div>

          {/* Error Message */}
          <Show when={error()}>
            <div class="mb-4 p-3 bg-danger-100 dark:bg-danger-500/20 border border-danger-200 dark:border-danger-500/30 rounded-lg">
              <p class="text-sm text-danger-600 dark:text-danger-400">{error()}</p>
            </div>
          </Show>

          {/* Action Buttons */}
          <div class="flex gap-3">
            <button
              onClick={handleCancel}
              disabled={uploading()}
              class="flex-1 py-2 px-4 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-text-800 dark:text-text-200 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={uploading() || !props.selectedFile}
              class="flex-1 py-2 px-4 rounded-lg bg-secondary-500 hover:bg-secondary-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Show when={!uploading()} fallback="Uploading...">
                <FiSend class="w-4 h-4" />
                Send Image
              </Show>
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default ImageUpload;