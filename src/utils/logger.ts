/**
 * ChatWii Centralized Logging Utility
 * Environment-based logging that removes all console statements in production
 */

// Environment checks
const DEBUG = import.meta.env.DEV;
const PROD = import.meta.env.PROD;

// Log levels
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (error: Error | string, ...args: any[]) => void;
  table: (data: any) => void;
}

/**
 * Development-only debug logging
 */
const logDebug = (...args: any[]): void => {
  if (DEBUG) {
    console.log('[ChatWii Debug]', ...args);
  }
};

/**
 * Development-only info logging
 */
const logInfo = (...args: any[]): void => {
  if (DEBUG) {
    console.info('[ChatWii Info]', ...args);
  }
};

/**
 * Development-only warning logging
 */
const logWarn = (...args: any[]): void => {
  if (DEBUG) {
    console.warn('[ChatWii Warning]', ...args);
  }
};

/**
 * Error logging with production monitoring integration
 */
const logError = (error: Error | string, ...args: any[]): void => {
  if (PROD) {
    // In production, send to error monitoring service
    // TODO: Integrate with error monitoring service (Sentry, LogRocket, etc.)
    // For now, we suppress all console output in production
  } else {
    // Development only
    console.error('[ChatWii Error]', error, ...args);
  }
};

/**
 * Development-only table logging
 */
const logTable = (data: any): void => {
  if (DEBUG) {
    console.table(data);
  }
};

/**
 * Main logger instance
 */
export const logger: Logger = {
  debug: logDebug,
  info: logInfo,
  warn: logWarn,
  error: logError,
  table: logTable
};

/**
 * Service-specific loggers for better debugging
 */
export const createServiceLogger = (serviceName: string) => ({
  debug: (...args: any[]) => logDebug(`[${serviceName}]`, ...args),
  info: (...args: any[]) => logInfo(`[${serviceName}]`, ...args),
  warn: (...args: any[]) => logWarn(`[${serviceName}]`, ...args),
  error: (error: Error | string, ...args: any[]) => logError(`[${serviceName}] ${error}`, ...args),
  table: (data: any) => logTable(data)
});

// Export default logger
export default logger;