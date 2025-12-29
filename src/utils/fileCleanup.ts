/**
 * File Cleanup Utility
 */

import fs from 'fs';
import { logger } from '../config';

/**
 * Safely deletes a file from the filesystem
 * 
 * @param filePath - Absolute path to file
 */
export function deleteFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);

      logger.debug('File deleted successfully', { filePath });
    } else {
      logger.debug('File already deleted or does not exist', { filePath });
    }
  } catch (error) {
    logger.error('Failed to delete file', {
      filePath,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Checks if a file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}