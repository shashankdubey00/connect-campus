/**
 * Error Handling Utilities
 * 
 * Provides standardized error classes and error response helpers
 * for consistent error handling across the application.
 * 
 * Usage:
 *   import { AppError, handleError } from '../utils/errors.js';
 *   throw new AppError('User not found', 404);
 */

import logger from './logger.js';

/**
 * Custom Application Error Class
 * Extends Error with status code and optional error code
 */
export class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {string} errorCode - Optional error code for client handling
   */
  constructor(message, statusCode = 500, errorCode = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true; // Mark as operational error (expected)
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Standard error response format
 * @param {Error} error - Error object
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {object} next - Express next function
 */
export const handleError = (error, req, res, next) => {
  // Log error with context
  logger.error('Request error', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.userId,
  });

  // Determine status code
  const statusCode = error.statusCode || error.status || 500;
  
  // Determine error message (don't leak details in production)
  const isDevelopment = process.env.NODE_ENV === 'development';
  const message = isDevelopment 
    ? error.message 
    : error.isOperational 
      ? error.message 
      : 'An error occurred. Please try again later.';

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(error.errorCode && { errorCode: error.errorCode }),
    ...(isDevelopment && { 
      stack: error.stack,
      error: error.name 
    }),
  });
};

/**
 * Async error wrapper - catches errors in async route handlers
 * @param {Function} fn - Async function to wrap
 * @returns {Function} - Wrapped function
 * 
 * Usage:
 *   router.get('/route', asyncHandler(async (req, res) => {
 *     // async code here
 *   }));
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Common error messages
 */
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'You do not have permission to perform this action',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation failed',
  SERVER_ERROR: 'Internal server error',
  RATE_LIMIT: 'Too many requests. Please try again later.',
};

/**
 * Common error codes for client-side handling
 */
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  SERVER_ERROR: 'SERVER_ERROR',
};






