/**
 * Type definitions for upload status tracking
 * These types define the structure stored in Redis
 */

import { FailedRecord } from "@/schemas";

/**
 * Response for in-progress status checks
 * Simplified response while processing is ongoing
 */
export interface ProcessingStatusResponse {
  uploadId: string;
  status: 'processing';
  progress: string; // e.g., "70%"
}

/**
 * Response for completed status checks
 * Full details available when processing is done
 */
export interface CompletedStatusResponse {
  uploadId: string;
  status: 'completed';
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  details: FailedRecord[];
}

/**
 * Response for failed status checks
 */
export interface FailedStatusResponse {
  uploadId: string;
  status: 'failed';
  error: string;
  processedRecords: number;
  failedRecords: number;
  details: FailedRecord[];
}

/**
 * Union type for all possible status responses
 */
export type StatusResponse = 
  | ProcessingStatusResponse 
  | CompletedStatusResponse 
  | FailedStatusResponse;