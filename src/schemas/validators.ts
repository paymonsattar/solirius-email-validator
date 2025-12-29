/**
 * Schema Validation Helper Functions
 * 
 * Provides convenient wrapper functions for common validation operations.
 * These abstract away Zod's API and provide cleaner interfaces for the rest
 * of the application.
 */

import {
  uuidSchema,
  emailSchema,
  uploadStatusSchema,
} from './schemas';
import type { UploadStatus } from './types';

/**
 * Validates if a string is a valid UUID v4
 */
export function isValidUuid(value: string): boolean {
  return uuidSchema.safeParse(value).success;
}

/**
 * Validates if a string is a valid email format
 */
export function isValidEmail(value: string): boolean {
  return emailSchema.safeParse(value).success;
}

/**
 * Parses and validates upload status from database
 */
export function parseUploadStatus(data: unknown): UploadStatus | null {
  const result = uploadStatusSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  return null;
}

/**
 * Gets validation error messages from a Zod error
 */
export function formatZodErrors(error: { issues: ReadonlyArray<{ path: ReadonlyArray<string | number | symbol>; message: string }> }): string {
  return error.issues
    .map(issue => `${issue.path.join('.')}: ${issue.message}`)
    .join(', ');
}