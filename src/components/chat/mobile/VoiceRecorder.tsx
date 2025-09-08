import { createSignal, createEffect, onCleanup, Show } from 'solid-js';
import { FiMic, FiMicOff, FiPlay, FiPause, FiTrash2, FiSend, FiX } from 'solid-icons/fi';
import { voiceService, type VoiceUploadResult } from '../../../services/supabase';

type VoiceRecording = VoiceUploadResult;

interface VoiceRecorderProps {
  isOpen: boolean;
  onSend: (recording: VoiceRecording) => void;
  onCancel: () => void;
  disabled?: boolean;
  userRole: string;
}

export default function VoiceRecorder(props: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = createSignal(false);
  const [currentRecording, setCurrentRecording] = createSignal<VoiceRecording | null>(null);
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [currentDuration, setCurrentDuration] = createSignal(0);
  const [recordingError, setRecordingError] = createSignal('');
  const [hasPermission, setHasPermission] = createSignal(false);
  
  let durationInterval: NodeJS.Timeout | null = null;
  let audioElement: HTMLAudioElement | null = null;

  // Check permissions and browser support when component mounts
  createEffect(async () => {
    if (props.isOpen && voiceService.isSupported()) {
      const permission = await voiceService.requestPermission();
      setHasPermission(permission);
      if (!permission) {
        setRecordingError('Microphone permission denied. Please allow microphone access to record voice messages.');
      }
    }
  });

  // Clean up when component unmounts
  onCleanup(() => {
    stopDurationTimer();
    stopPlayback();
    if (currentRecording()) {
      voiceService.revokeObjectURL(currentRecording()!.url);
    }
  });

  const startDurationTimer = () => {
    durationInterval = setInterval(() => {
      setCurrentDuration(voiceService.getCurrentDuration());
    }, 100);
  };

  const stopDurationTimer = () => {
    if (durationInterval) {
      clearInterval(durationInterval);
      durationInterval = null;
    }
  };

  const handleStartRecording = async () => {
    if (!hasPermission()) {
      const permission = await voiceService.requestPermission();
      if (!permission) {
        setRecordingError('Microphone permission required to record voice messages.');
        return;
      }
      setHasPermission(true);
    }

    setRecordingError('');
    const started = await voiceService.startRecording();
    
    if (started) {
      setIsRecording(true);
      setCurrentDuration(0);
      startDurationTimer();
    } else {
      setRecordingError('Failed to start recording. Please try again.');
    }
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    stopDurationTimer();
    
    const recording = await voiceService.stopRecording();
    if (recording) {
      const validation = voiceService.validateRecording(recording);
      if (validation.valid) {
        setCurrentRecording(recording);
      } else {
        setRecordingError(validation.error || 'Recording failed validation');
        if (recording.url) {
          voiceService.revokeObjectURL(recording.url);
        }
      }
    } else {
      setRecordingError('Recording failed or was too short.');
    }
  };

  const handleCancelRecording = () => {
    if (isRecording()) {
      voiceService.cancelRecording();
      setIsRecording(false);
      stopDurationTimer();
    }
    
    if (currentRecording()) {
      voiceService.revokeObjectURL(currentRecording()!.url);
      setCurrentRecording(null);
    }
    
    setCurrentDuration(0);
    setRecordingError('');
  };

  const handlePlayback = () => {
    const recording = currentRecording();
    if (!recording) return;

    if (isPlaying()) {
      stopPlayback();
    } else {
      startPlayback(recording.url);
    }
  };

  const startPlayback = (url: string) => {
    stopPlayback(); // Stop any existing playback
    
    audioElement = new Audio(url);
    audioElement.addEventListener('ended', () => {
      setIsPlaying(false);
      audioElement = null;
    });
    
    audioElement.addEventListener('error', () => {
      setIsPlaying(false);
      audioElement = null;
      setRecordingError('Failed to play recording');
    });

    audioElement.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      setRecordingError('Failed to play recording');
    });
  };

  const stopPlayback = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      audioElement = null;
    }
    setIsPlaying(false);
  };

  const handleSend = () => {
    const recording = currentRecording();
    if (recording) {
      props.onSend(recording);
      setCurrentRecording(null);
      setCurrentDuration(0);
      setRecordingError('');
    }
  };

  const handleCancel = () => {
    handleCancelRecording();
    props.onCancel();
  };

  const canRecord = () => {
    return voiceService.canSendVoiceMessage(props.userRole) && hasPermission() && !props.disabled;
  };

  const formatTime = (seconds: number): string => {
    return voiceService.formatDuration(seconds);
  };

  const getMaxDuration = (): number => {
    return voiceService.getMaxDuration();
  };

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div class="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Voice Message
            </h3>
            <button
              onClick={handleCancel}
              class="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            >
              <FiX class="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
            </button>
          </div>

          {/* Permission/Support Check */}
          <Show when={!voiceService.isSupported()}>
            <div class="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p class="text-sm text-red-600 dark:text-red-400">
                Voice recording is not supported in your browser. Please use a modern browser with microphone support.
              </p>
            </div>
          </Show>

          <Show when={!canRecord() && voiceService.isSupported()}>
            <div class="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p class="text-sm text-yellow-600 dark:text-yellow-400">
                Voice messages are available for VIP and Admin users only.
              </p>
            </div>
          </Show>

          {/* Error Display */}
          <Show when={recordingError()}>
            <div class="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p class="text-sm text-red-600 dark:text-red-400">
                {recordingError()}
              </p>
            </div>
          </Show>

          {/* Recording Interface */}
          <Show when={canRecord() && voiceService.isSupported()}>
            <div class="space-y-4">
              {/* Duration Display */}
              <div class="text-center">
                <div class="text-2xl font-mono text-neutral-900 dark:text-neutral-100 mb-1">
                  {formatTime(currentDuration())}
                </div>
                <div class="text-xs text-neutral-500 dark:text-neutral-400">
                  Max: {formatTime(getMaxDuration())}
                </div>
              </div>

              {/* Recording Controls */}
              <div class="flex items-center justify-center gap-4">
                <Show when={!currentRecording()}>
                  <Show
                    when={!isRecording()}
                    fallback={
                      <button
                        onClick={handleStopRecording}
                        class="p-4 bg-red-500 hover:bg-red-600 rounded-full text-white transition-all duration-200 hover:scale-105"
                        title="Stop recording"
                      >
                        <FiMicOff class="w-6 h-6" />
                      </button>
                    }
                  >
                    <button
                      onClick={handleStartRecording}
                      class="p-4 bg-blue-500 hover:bg-blue-600 rounded-full text-white transition-all duration-200 hover:scale-105"
                      title="Start recording"
                    >
                      <FiMic class="w-6 h-6" />
                    </button>
                  </Show>
                </Show>

                {/* Playback and Action Controls */}
                <Show when={currentRecording()}>
                  <button
                    onClick={handlePlayback}
                    class="p-3 bg-green-500 hover:bg-green-600 rounded-full text-white transition-all duration-200 hover:scale-105"
                    title={isPlaying() ? "Pause playback" : "Play recording"}
                  >
                    <Show
                      when={!isPlaying()}
                      fallback={<FiPause class="w-5 h-5" />}
                    >
                      <FiPlay class="w-5 h-5" />
                    </Show>
                  </button>

                  <button
                    onClick={handleCancelRecording}
                    class="p-3 bg-red-500 hover:bg-red-600 rounded-full text-white transition-all duration-200 hover:scale-105"
                    title="Delete recording"
                  >
                    <FiTrash2 class="w-5 h-5" />
                  </button>

                  <button
                    onClick={handleSend}
                    class="p-3 bg-blue-500 hover:bg-blue-600 rounded-full text-white transition-all duration-200 hover:scale-105"
                    title="Send voice message"
                  >
                    <FiSend class="w-5 h-5" />
                  </button>
                </Show>

                {/* Cancel recording while recording */}
                <Show when={isRecording()}>
                  <button
                    onClick={handleCancelRecording}
                    class="p-3 bg-neutral-500 hover:bg-neutral-600 rounded-full text-white transition-all duration-200 hover:scale-105"
                    title="Cancel recording"
                  >
                    <FiX class="w-5 h-5" />
                  </button>
                </Show>
              </div>

              {/* Recording Info */}
              <Show when={currentRecording()}>
                <div class="text-center text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                  <div>
                    Duration: {formatTime(currentRecording()!.duration)}
                  </div>
                  <div>
                    Size: {voiceService.formatFileSize(currentRecording()!.blob.size)}
                  </div>
                </div>
              </Show>

              {/* Recording Status */}
              <Show when={isRecording()}>
                <div class="text-center">
                  <div class="inline-flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/30 rounded-full">
                    <div class="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span class="text-sm text-red-600 dark:text-red-400 font-medium">
                      Recording...
                    </span>
                  </div>
                </div>
              </Show>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
}