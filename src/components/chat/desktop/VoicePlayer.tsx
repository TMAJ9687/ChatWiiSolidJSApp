import { createSignal, createEffect, onCleanup, Show } from 'solid-js';
import { FiPlay, FiPause, FiDownload, FiMic } from 'solid-icons/fi';
import { voiceService } from '../../../services/supabase';
import { createServiceLogger } from '../../../utils/logger';

const logger = createServiceLogger('VoicePlayer');

// Define VoiceData type to match what's used in the component
type VoiceData = {
  url: string;
  duration: number;
};

interface VoicePlayerProps {
  voiceData: VoiceData;
  className?: string;
  showDownload?: boolean;
}

export default function VoicePlayer(props: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [currentTime, setCurrentTime] = createSignal(0);
  const [duration, setDuration] = createSignal(props.voiceData.duration);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal('');

  let audioElement: HTMLAudioElement | null = null;
  let progressInterval: NodeJS.Timeout | null = null;

  // Clean up when component unmounts
  onCleanup(() => {
    cleanup();
  });

  const cleanup = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('error', handleError);
      audioElement.removeEventListener('canplay', handleCanPlay);
      audioElement = null;
    }
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  };

  const initializeAudio = () => {
    if (audioElement) return;

    setIsLoading(true);
    setError('');

    audioElement = new Audio(props.voiceData.url);
    audioElement.preload = 'metadata';

    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('error', handleError);
    audioElement.addEventListener('canplay', handleCanPlay);

    audioElement.load();
  };

  const handleLoadedMetadata = () => {
    if (audioElement) {
      const audioDuration = audioElement.duration;
      if (isFinite(audioDuration)) {
        setDuration(audioDuration);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioElement) {
      setCurrentTime(audioElement.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  };

  const handleError = () => {
    setIsLoading(false);
    setIsPlaying(false);
    setError('Failed to load voice message');
  };

  const handleCanPlay = () => {
    setIsLoading(false);
  };

  const handlePlay = () => {
    if (!audioElement) {
      initializeAudio();
      // Wait for audio to be ready before playing
      setTimeout(() => handlePlay(), 100);
      return;
    }

    if (isPlaying()) {
      audioElement.pause();
      setIsPlaying(false);
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
    } else {
      audioElement.play()
        .then(() => {
          setIsPlaying(true);
          // Start progress tracking
          progressInterval = setInterval(() => {
            if (audioElement) {
              setCurrentTime(audioElement.currentTime);
            }
          }, 100);
        })
        .catch(() => {
          setError('Failed to play voice message');
        });
    }
  };

  const handleSeek = (event: MouseEvent) => {
    if (!audioElement) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    const seekTime = percent * duration();

    audioElement.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = props.voiceData.url;
      link.download = `voice-message-${props.voiceData.timestamp}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      logger.error('Failed to download voice message:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    return voiceService.formatDuration(seconds);
  };

  const getProgress = (): number => {
    if (duration() === 0) return 0;
    return (currentTime() / duration()) * 100;
  };

  return (
    <div class={`
      flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 
      rounded-lg border border-neutral-200 dark:border-neutral-700
      ${props.className || ''}
    `}>
      {/* Voice Icon */}
      <div class="flex-shrink-0">
        <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
          <FiMic class="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      {/* Play/Pause Button */}
      <button
        onClick={handlePlay}
        disabled={isLoading() || !!error()}
        class={`
          flex-shrink-0 p-2 rounded-full transition-all duration-200
          ${isLoading() || error() 
            ? 'bg-neutral-200 dark:bg-neutral-700 cursor-not-allowed opacity-50' 
            : 'bg-blue-500 hover:bg-blue-600 text-white hover:scale-105'
          }
        `}
        title={isPlaying() ? 'Pause' : 'Play'}
      >
        <Show
          when={!isLoading()}
          fallback={<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        >
          <Show
            when={!isPlaying()}
            fallback={<FiPause class="w-4 h-4" />}
          >
            <FiPlay class="w-4 h-4 ml-0.5" />
          </Show>
        </Show>
      </button>

      {/* Progress and Time Display */}
      <div class="flex-1 min-w-0">
        <Show
          when={!error()}
          fallback={
            <div class="text-sm text-red-500 dark:text-red-400">
              {error()}
            </div>
          }
        >
          {/* Progress Bar */}
          <div
            class="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full cursor-pointer mb-1"
            onClick={handleSeek}
          >
            <div
              class="h-full bg-blue-500 rounded-full transition-all duration-150"
              style={`width: ${getProgress()}%`}
            />
          </div>

          {/* Time Display */}
          <div class="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
            <span>{formatTime(currentTime())}</span>
            <span>{formatTime(duration())}</span>
          </div>
        </Show>
      </div>

      {/* File Size */}
      <div class="flex-shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
        {voiceService.formatFileSize(props.voiceData.size)}
      </div>

      {/* Download Button */}
      <Show when={props.showDownload !== false}>
        <button
          onClick={handleDownload}
          class="flex-shrink-0 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 transition-colors"
          title="Download voice message"
        >
          <FiDownload class="w-4 h-4" />
        </button>
      </Show>
    </div>
  );
}