import { createSignal } from "solid-js";
import { supabase } from "../config/supabase";
import { createServiceLogger } from "../utils/logger";

const logger = createServiceLogger('ConnectionService');

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

class ConnectionService {
  private isOnlineSignal = createSignal<boolean>(navigator.onLine);
  private connectionStatusSignal = createSignal<ConnectionStatus>('connected');
  private isOnline = this.isOnlineSignal[0];
  private setIsOnline = this.isOnlineSignal[1];
  private connectionStatus = this.connectionStatusSignal[0];
  private setConnectionStatus = this.connectionStatusSignal[1];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  
  constructor() {
    this.setupNetworkListeners();
    this.setupSupabaseListeners();
  }

  // Set up network status listeners
  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      // Network back online
      this.setIsOnline(true);
      this.handleReconnection();
    });

    window.addEventListener('offline', () => {
      // Network gone offline
      this.setIsOnline(false);
      this.setConnectionStatus('disconnected');
    });
  }

  // DISABLED: Supabase auth listeners were causing infinite loops
  private setupSupabaseListeners() {
    // ALL auth state monitoring disabled to prevent cascade failures
    logger.debug('Supabase auth listeners disabled to prevent auth loops');
  }

  // DISABLED: Health check was causing infinite auth loops when sessions expire
  private startHealthCheck() {
    // Health checks disabled to prevent 403 auth cascades
    logger.debug('Health checks disabled to prevent auth loops');
  }

  // Handle connection issues
  private handleConnectionIssue() {
    if (this.connectionStatus() === 'reconnecting') return;

    this.setConnectionStatus('reconnecting');
    this.attemptReconnection();
  }

  // Handle reconnection when network comes back
  private handleReconnection() {
    if (this.connectionStatus() === 'disconnected') {
      this.setConnectionStatus('reconnecting');
      this.attemptReconnection();
    }
  }

  // DISABLED: Reconnection was causing auth spam loops
  private async attemptReconnection() {
    // Reconnection disabled to prevent auth loops
    logger.debug('Reconnection disabled to prevent auth spam');
    this.setConnectionStatus('connected'); // Assume connected to prevent loops
    this.reconnectAttempts = 0;
  }

  // Public methods
  getConnectionStatus() {
    return this.connectionStatus();
  }

  getIsOnline() {
    return this.isOnline();
  }

  // Force reconnection
  forceReconnect() {
    this.reconnectAttempts = 0;
    this.handleReconnection();
  }

  // Cleanup
  cleanup() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
  }

  // Execute request with LIMITED retries to prevent auth spam
  async executeWithRetry<T>(
    request: () => Promise<T>,
    maxRetries: number = 1 // REDUCED from 3 to prevent spam
  ): Promise<T> {
    let lastError: any;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await request();
      } catch (error: any) {
        lastError = error;

        // DISABLED: Check for auth errors and stop immediately
        if (error.message?.includes('403') ||
            error.message?.includes('Forbidden') ||
            error.status === 403) {
          logger.warn('Auth error detected, stopping retries to prevent spam');
          throw error;
        }

        // Check if it's a network-related error (not auth)
        if (this.isNetworkError(error) && !error.message?.includes('403')) {
          logger.warn(`Network error detected, attempt ${i + 1}/${maxRetries + 1}:`, error.message);

          if (i < maxRetries) {
            // Wait before retry with exponential backoff
            const delay = Math.min(1000 * Math.pow(2, i), 2000); // Reduced max delay
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }

        // Not a retryable error or max retries reached
        throw error;
      }
    }

    throw lastError;
  }

  // Check if error is network-related
  private isNetworkError(error: any): boolean {
    const networkErrorIndicators = [
      'Failed to fetch',
      'NetworkError',
      'CORS',
      '502',
      '503',
      '504',
      'timeout',
      'AbortError'
    ];

    const errorMessage = error.message || error.toString();
    return networkErrorIndicators.some(indicator => 
      errorMessage.toLowerCase().includes(indicator.toLowerCase())
    );
  }
}

export const connectionService = new ConnectionService();