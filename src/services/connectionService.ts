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

  // Set up Supabase connection listeners
  private setupSupabaseListeners() {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && this.isOnline()) {
        // Session lost - possible network issue
        this.handleConnectionIssue();
      }
    });

    // Monitor realtime channel status instead of direct connection
    // We'll use periodic health checks instead of realtime listeners
    this.startHealthCheck();
  }

  // Start periodic health check instead of relying on realtime events
  private startHealthCheck() {
    // Check connection health every 30 seconds
    setInterval(async () => {
      if (this.isOnline() && this.connectionStatus() === 'connected') {
        try {
          // Simple health check - try to get current user
          await supabase.auth.getUser();
        } catch (error: any) {
          logger.warn('Health check failed:', error);
          if (this.isNetworkError(error)) {
            this.handleConnectionIssue();
          }
        }
      }
    }, 30000);
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

  // Attempt to reconnect to Supabase
  private async attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached. Please refresh the page.');
      this.setConnectionStatus('disconnected');
      return;
    }

    this.reconnectAttempts++;
    // Attempting reconnection

    try {
      // Test connection with auth check (simpler than database query)
      await supabase.auth.getUser();
      
      // Reconnection successful
      this.setConnectionStatus('connected');
      this.reconnectAttempts = 0;
      return;
    } catch (error) {
      logger.warn('Reconnection failed:', error);
    }

    // Schedule next retry with exponential backoff
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    this.reconnectTimeout = setTimeout(() => {
      if (this.isOnline()) {
        this.attemptReconnection();
      }
    }, delay);
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

  // Execute request with connection handling
  async executeWithRetry<T>(
    request: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: any;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await request();
      } catch (error: any) {
        lastError = error;

        // Check if it's a network-related error
        if (this.isNetworkError(error)) {
          logger.warn(`Network error detected, attempt ${i + 1}/${maxRetries + 1}:`, error.message);
          
          if (i < maxRetries) {
            // Wait before retry with exponential backoff
            const delay = Math.min(1000 * Math.pow(2, i), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Trigger reconnection if needed
            if (this.connectionStatus() === 'connected') {
              this.handleConnectionIssue();
            }
            continue;
          }
        }

        // Not a network error or max retries reached
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