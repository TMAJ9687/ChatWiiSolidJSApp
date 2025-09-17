import { supabase } from "../../config/supabase";
import { createServiceLogger } from "../../utils/logger";

const logger = createServiceLogger('VoiceService');

interface VoiceUploadResult {
  url: string;
  fileName: string;
  duration: number;
  size: number;
}

class VoiceService {
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_TYPES = ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mp3', 'audio/m4a'];
  private mediaRecorder: MediaRecorder | null = null;
  private recordingChunks: Blob[] = [];
  private startTime: number = 0;

  // Start voice recording
  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });

      // Use webm codec if available, fallback to others
      const options = this.getRecordingOptions();
      this.mediaRecorder = new MediaRecorder(stream, options);
      
      this.recordingChunks = [];
      this.startTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordingChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // Collect data every second
    } catch (error) {
      logger.error('Error starting voice recording:', error);
      throw new Error('Failed to start recording. Please check microphone permissions.');
    }
  }

  // Stop voice recording
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.recordingChunks, { type: mimeType });
        
        // Stop all tracks to release microphone
        this.mediaRecorder?.stream.getTracks().forEach(track => track.stop());
        
        resolve(audioBlob);
      };

      this.mediaRecorder.onerror = (event) => {
        reject(new Error('Recording failed'));
      };

      this.mediaRecorder.stop();
    });
  }

  // Get recording duration
  getRecordingDuration(): number {
    return this.startTime ? Date.now() - this.startTime : 0;
  }

  // Cancel recording
  cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    this.recordingChunks = [];
    this.mediaRecorder = null;
  }

  // Get supported recording options
  private getRecordingOptions(): MediaRecorderOptions {
    const options: MediaRecorderOptions = {};
    
    // Try webm first (best quality)
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      options.mimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/webm')) {
      options.mimeType = 'audio/webm';
    } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
      options.mimeType = 'audio/ogg;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      options.mimeType = 'audio/mp4';
    }
    
    return options;
  }

  // Validate voice file
  validateVoiceFile(file: Blob): string | null {
    if (file.size > this.MAX_FILE_SIZE) {
      return `Voice message size must be less than ${this.MAX_FILE_SIZE / 1024 / 1024}MB`;
    }

    if (file.type && !this.ALLOWED_TYPES.includes(file.type)) {
      return 'Unsupported audio format';
    }

    return null;
  }

  // Upload voice message to Supabase Storage
  async uploadVoiceMessage(
    audioBlob: Blob,
    userId: string,
    conversationId: string,
    duration: number
  ): Promise<VoiceUploadResult> {
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Validate voice file
    const validationError = this.validateVoiceFile(audioBlob);
    if (validationError) {
      throw new Error(validationError);
    }

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileExt = this.getFileExtension(audioBlob.type);
      const fileName = `${userId}_${conversationId}_${timestamp}_${randomId}.${fileExt}`;
      const filePath = fileName;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('voice-messages')
        .upload(filePath, audioBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: audioBlob.type || 'audio/webm'
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(filePath);

      return {
        url: publicUrlData.publicUrl,
        fileName: fileName,
        duration: Math.round(duration / 1000), // Convert to seconds
        size: audioBlob.size
      };
    } catch (error) {
      logger.error('Error uploading voice message:', error);
      throw new Error('Failed to upload voice message. Please try again.');
    }
  }

  // Delete voice message from storage
  async deleteVoiceMessage(fileName: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from('voice-messages')
        .remove([fileName]);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Error deleting voice message:', error);
      throw new Error('Failed to delete voice message');
    }
  }

  // Get file extension from MIME type
  private getFileExtension(mimeType: string): string {
    const mimeToExt: { [key: string]: string } = {
      'audio/webm': 'webm',
      'audio/ogg': 'ogg',
      'audio/wav': 'wav',
      'audio/mp3': 'mp3',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'mp4',
      'audio/m4a': 'm4a'
    };

    return mimeToExt[mimeType] || 'webm';
  }

  // Format duration for display
  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Check microphone permission
  async checkMicrophonePermission(): Promise<boolean> {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state === 'granted';
    } catch (error) {
      // Fallback: try to access microphone
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch {
        return false;
      }
    }
  }

  // Request microphone permission
  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      logger.error('Microphone permission denied:', error);
      return false;
    }
  }

  /**
   * Check if voice recording is supported by the browser
   */
  isSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder &&
      MediaRecorder.isTypeSupported
    );
  }

  /**
   * Check if user can send voice messages (VIP/Admin only)
   */
  canSendVoiceMessage(userRole: string): boolean {
    return ['vip', 'admin'].includes(userRole.toLowerCase());
  }
}

export const voiceService = new VoiceService();
export type { VoiceUploadResult };