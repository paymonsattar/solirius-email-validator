/**
 * Type definitions for file upload operations
 * These types ensure type safety across the upload flow
 */

import { CsvRow } from "@/schemas";

/**
 * Response returned immediately after file upload
 * The client uses uploadId to poll for status
 */
export interface UploadResponse {
  uploadId: string;
  message: string;
}

/**
 * Response when multiple files are uploaded
 * Each file gets its own uploadId for independent tracking
 */
export interface MultiUploadResponse {
  uploads: UploadResponse[];
  message: string;
}

/**
 * Parsed file data ready for processing
 */
export interface ParsedFileData {
  uploadId: string;
  filePath: string;
  rows: CsvRow[];
  totalRecords: number;
}

/**
 * File metadata stored during upload
 */
export interface FileMetadata {
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
}