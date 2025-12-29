import winston from 'winston';
import path from 'path';
import { config } from './env';

/**
 * Custom log format, this will provide us a consistent log
 * output with metadata
 * 
 * Format: "2025-01-01 12:00:00 [INFO]: Message {metadata}"
 */
const logFormat = winston.format.combine(
  // Add a timestamp to every log entry
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  
  // Capture stack traces from Error objects
  winston.format.errors({ stack: true }),
  
  // Custom message format
  winston.format.printf(({ timestamp, level, message, stack, ...metadata }) => {
    // Include metadata as JSON if present
    const metaString = Object.keys(metadata).length > 0
      ? ` ${JSON.stringify(metadata)}`
      : '';
    
    // Include stack trace for errors
    const stackString = stack ? `\n${stack}` : '';
    
    return `${timestamp} [${level.toUpperCase()}]: ${message}${metaString}${stackString}`;
  })
);

/**
 * Build transport array based on environment
 * 
 * - Development: colorised console output
 * - Production: file logging for persistence
 * - Test: minimal logging to reduce noise
 */
function buildTransports(): winston.transport[] {
  const transports: winston.transport[] = [];

  // Keep console transport - always enabled, this gives us
  // immediate feedback during development
  transports.push(
    new winston.transports.Console({
      format: config.server.isDevelopment
        ? winston.format.combine(winston.format.colorize(), logFormat)
        : logFormat,
    })
  );

  // Disable file transports in test
  if (!config.server.isTest) {
    // Error log - errors only for quick issue identification
    transports.push(
      new winston.transports.File({
        filename: path.join(config.logging.dir, 'error.log'),
        level: 'error',
        format: logFormat,
      })
    );

    // Combined log - all levels for comprehensive history
    transports.push(
      new winston.transports.File({
        filename: path.join(config.logging.dir, 'combined.log'),
        format: logFormat,
      })
    );
  }

  return transports;
}

/**
 * Logger instance singleton to use in app
 */
export const logger = winston.createLogger({
  level: config.logging.level,

  transports: buildTransports(),
  
  // Don't crash on logging errors, we don't want the app to
  // crash on a logging error
  exitOnError: false,
});