import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { config, logger } from '../config';

/**
 * Rate limiter for upload endpoints
 */
export const uploadRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,

  // Clients can see remaining quota
  // X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    error: 'TooManyRequests',
    message: `Rate limit exceeded. Maximum ${config.rateLimit.maxRequests} uploads per ${config.rateLimit.windowMs / 1000} seconds.`,
  },

  handler: (req, res, _next, options) => {
    logger.warn('Upload rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      limit: options.max,
    });

    res.status(429).json(options.message);
  },

  // We skip when testing
  skip: () => config.server.isTest,
});

/**
 * Rate limiter for status endpoints
 */
export const statusRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: config.rateLimit.windowMs,
  // Status checks should be more permissive than uploads, file uploads
  // are expensive - these arn't
  max: config.rateLimit.maxRequests * 10,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    error: 'TooManyRequests',
    message: 'Status check rate limit exceeded. Please reduce polling frequency.',
  },

  // We skip when testing
  skip: () => config.server.isTest,
});