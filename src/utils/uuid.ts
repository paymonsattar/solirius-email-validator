/**
 * UUID Utilities
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a new UUID v4 for upload identification
 */
export function generateUploadId(): string {
  return uuidv4();
}