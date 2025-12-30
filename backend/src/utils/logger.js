/**
 * Structured Logging Utility
 * 
 * Provides consistent logging across the application with different log levels.
 * In production, logs should be structured (JSON) for easier parsing.
 * 
 * Usage:
 *   import logger from '../utils/logger.js';
 *   logger.info('User logged in', { userId: '123' });
 *   logger.error('Database error', { error, query });
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Log levels
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const currentLogLevel = isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;

/**
 * Format log message for development (human-readable) or production (JSON)
 */
const formatLog = (level, message, data = {}) => {
  const timestamp = new Date().toISOString();
  
  if (isDevelopment) {
    // Human-readable format for development
    const emoji = {
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      debug: '🔍',
    }[level] || '📝';
    
    console.log(
      `${emoji} [${timestamp}] ${level.toUpperCase()}: ${message}`,
      Object.keys(data).length > 0 ? data : ''
    );
  } else {
    // Structured JSON format for production
    console.log(JSON.stringify({
      timestamp,
      level: level.toUpperCase(),
      message,
      ...data,
    }));
  }
};

/**
 * Logger object with different log levels
 */
const logger = {
  /**
   * Log error messages
   * @param {string} message - Error message
   * @param {object} data - Additional error context
   */
  error: (message, data = {}) => {
    if (currentLogLevel >= LOG_LEVELS.ERROR) {
      formatLog('error', message, data);
    }
  },

  /**
   * Log warning messages
   * @param {string} message - Warning message
   * @param {object} data - Additional context
   */
  warn: (message, data = {}) => {
    if (currentLogLevel >= LOG_LEVELS.WARN) {
      formatLog('warn', message, data);
    }
  },

  /**
   * Log informational messages
   * @param {string} message - Info message
   * @param {object} data - Additional context
   */
  info: (message, data = {}) => {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
      formatLog('info', message, data);
    }
  },

  /**
   * Log debug messages (development only)
   * @param {string} message - Debug message
   * @param {object} data - Additional context
   */
  debug: (message, data = {}) => {
    if (currentLogLevel >= LOG_LEVELS.DEBUG) {
      formatLog('debug', message, data);
    }
  },
};

export default logger;

