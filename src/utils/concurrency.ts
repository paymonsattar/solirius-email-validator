/**
 * Concurrency Control Utility
 * 
 * Manages concurrency limits for email validation using p-limit.
 * Prevents overwhelming external services or exhausting resources.
 */

import pLimit from 'p-limit';
import { config } from '../config';

/**
 * Type for the limiter function returned by p-limit
 */
type LimitFunction = ReturnType<typeof pLimit>;

/**
 * Singleton limiter instance
 */
let validationLimiter: LimitFunction | null = null;

/**
 * Gets or creates the validation concurrency limiter
 * 
 * @returns Limiter function that wraps async operations
 * 
 * Usage:
 *   const limiter = getValidationLimiter();
 *   const result = await limiter(() => validateEmail(email));
 */
export function getValidationLimiter(): LimitFunction {
  if (!validationLimiter) {
    const maxConcurrency = config.processing.maxConcurrentValidations;

    validationLimiter = pLimit(maxConcurrency);
  }
  return validationLimiter;
}

/**
 * Resets the limiter (for testing)
 */
export function resetValidationLimiter(): void {
  validationLimiter = null;
}