/**
 * Additional Type Definitions
 * 
 * Contains TypeScript types that are NOT derived from Zod schemas.
 */

/**
 * Email validation result from the validation service
 */
export interface EmailValidationResult {
  valid: boolean;
}

/**
 * Detailed validation result with context
 */
export interface DetailedValidationResult {
  name: string;
  email: string;
  valid: boolean;
  error?: string;
}

/**
 * API response for single file upload
 */
export interface UploadResponse {
  uploadId: string;
  message: string;
}

/**
 * API response for multiple file upload
 */
export interface MultiUploadResponse {
  uploads: UploadResponse[];
  message: string;
}

/**
 * File info for batch processing
 */
export interface FileUploadInfo {
  uploadId: string;
  filePath: string;
  originalName: string;
  size: number;
}