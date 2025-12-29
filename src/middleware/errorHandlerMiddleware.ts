import { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { ValidationError, FileProcessingError, DatabaseError } from '../errors';
import { config, logger } from '../config';

// Standard error response shape
interface ErrorResponse {
  error: string;
  message: string;
  details?: string[];
  stack?: string;
}

/**
 * Determines if an error is operational and expected or is a programming error. 
 * We don't want to return programming errors as they could leak sensitive data.
 */
function isOperationalError(error: Error): boolean {
  if (error instanceof ValidationError || error instanceof FileProcessingError
    ||error instanceof DatabaseError || error instanceof MulterError
    || error instanceof ZodError) {
    return true
  }

  return false;
}

/**
 * Gets appropriate HTTP status code for error
 */
function getStatusCode(error: Error): number {
  // Our custom errors have statusCode
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    return error.statusCode;
  }

  // Zod validation errors are client errors
  if (error instanceof ZodError) {
    return 400;
  }

  // Multer errors have specific meanings
  if (error instanceof MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return 413; // Payload Too Large
      case 'LIMIT_FILE_COUNT':
      case 'LIMIT_UNEXPECTED_FILE':
        return 400;
      default:
        return 400;
    }
  }

  // Default to 500 for unknown errors
  return 500;
}

/**
 * Gets user-friendly message for Multer errors
 */
function getMulterErrorMessage(error: MulterError): string {
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return `File too large. Maximum size is ${config.upload.maxFileSize / (1024 * 1024)}MB.`;
    case 'LIMIT_FILE_COUNT':
      return `Too many files. Maximum is ${config.upload.maxFiles} files per request.`;
    case 'LIMIT_UNEXPECTED_FILE':
      return 'Unexpected field name. Use "file" for single upload or "files" for multiple.';
    default:
      return 'File upload error.';
  }
}

/**
 * Error Handler Middleware that centralises error handling for all
 * routes and converts errors to consistent API responses.
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = getStatusCode(error);

  if (statusCode >= 500) {
    logger.error('Server error', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.warn('Client error', {
      error: error.message,
      path: req.path,
      method: req.method,
    });
  }

  // Build response
  const response: ErrorResponse = {
    error: error.name || 'Error',
    message: isOperationalError(error) ? error.message : 'An unexpected error occurred.',
  };

  // Special handling for specific error types
  if (error instanceof MulterError) {
    response.message = getMulterErrorMessage(error);
  }

  if (error instanceof ZodError) {
    response.error = 'ValidationError';
    response.message = 'Validation failed';
    response.details = error.issues.map(issue => 
      `${issue.path.join('.')}: ${issue.message}`
    );
  }

  // Stack traces can leak sensitive info, we don't want to show these
  if (config.server.isDevelopment && error.stack) {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * 404 Not Found handler.
 * Must be added after all routes, catches unmatched paths
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.debug('Route not found', { path: req.path, method: req.method });

  res.status(404).json({
    error: 'NotFound',
    message: `Route ${req.method} ${req.path} not found.`,
  });
}