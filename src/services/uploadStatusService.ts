/**
 * Upload Status Service
 */

import { getDatabase } from '../database';
import { UploadStatus, FailedRecord, parseUploadStatus } from '../schemas';
import { logger } from '../config';

/**
 * Status for a single email during validation
 */
export type EmailRecordStatus = 'pending' | 'validating' | 'valid' | 'invalid';

/**
 * Tracks one email's validation status
 */
export interface EmailRecord {
  index: number; // Position in CSV
  name: string; // Recipient name
  email: string; // Email address
  status: EmailRecordStatus;
  error?: string; // Error message
}

/**
 * Database key naming
 *
 * Keeps upload data separate from other database keys.
 */
const KEY_PREFIX = 'upload:';

/**
 * TTL (Time To Live) for completed uploads
 */
const COMPLETED_TTL_SECONDS = 24 * 60 * 60;

/**
 * TTL for uploads that are still processing
 */
const PROCESSING_TTL_SECONDS = 60 * 60;

/**
 * Converts uploadId into database key
 */
function buildKey(uploadId: string): string {
  return `${KEY_PREFIX}${uploadId}`;
}

/**
 * Creates initial upload status record
 * 
 * This is called immediately after file upload accepted,
 * before processing starts. The client gets an uploadId 
 * and can start polling the /status enpoind.
 * 
 * @param uploadId - Unique upload identifier
 * @param totalRecords - Usually 0 initially (updated after CSV parsing)
 */
export async function createUploadStatus(
  uploadId: string,
  totalRecords: number = 0
): Promise<void> {
  const db = getDatabase();

  const status: UploadStatus = {
    uploadId,
    status: 'processing',
    totalRecords,
    processedRecords: 0,
    failedRecords: 0,
    progress: 0,
    details: [],
    emailRecords: [],
    createdAt: new Date().toISOString(),
  };

  // Store with 1-hour TTL
  await db.setWithExpiry(
    buildKey(uploadId),
    JSON.stringify(status),
    PROCESSING_TTL_SECONDS
  );

  logger.info('Upload status created', { uploadId, totalRecords });
}

/**
 * Retrieves upload status from database
 * 
 * Uses Zod schema to validate the data structure.
 * 
 * @param uploadId - Upload to look up
 * @returns Status object or null
 */
export async function getUploadStatus(uploadId: string): Promise<UploadStatus | null> {
  const db = getDatabase();
  const data = await db.get(buildKey(uploadId));

  if (!data) {
    logger.debug('Upload status not found', { uploadId });
    return null;
  }

  try {
    const parsed = JSON.parse(data);
    const validated = parseUploadStatus(parsed);

    if (!validated) {
      // Data exists but doesn't match schema
      logger.error('Upload status failed validation', { uploadId, data: parsed });

      return null;
    }

    return validated;
  } catch (error) {
    // JSON parsing failed or validation threw error
    logger.error('Failed to parse upload status', {
      uploadId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return null;
  }
}

/**
 * Sets up tracking for each individual email
 * 
 * @param uploadId - Which upload these emails belong to
 * @param records - Array of {name, email} from CSV
 */
export async function initialiseEmailRecords(
  uploadId: string,
  records: Array<{ name: string; email: string }>
): Promise<void> {
  const db = getDatabase();
  const key = buildKey(uploadId);
  const currentData = await db.get(key);

  if (!currentData) {
    logger.warn('Cannot initialise email records - status not found', { uploadId });
    return;
  }

  const status: UploadStatus = JSON.parse(currentData);
  
  status.totalRecords = records.length;
  
  // Create tracking record for each email
  status.emailRecords = records.map((record, index) => ({
    index,
    name: record.name,
    email: record.email,
    status: 'pending' as EmailRecordStatus,
  }));

  await db.setWithExpiry(key, JSON.stringify(status), PROCESSING_TTL_SECONDS);

  logger.debug('Email records initialised', { uploadId, count: records.length });
}

/**
 * Updates email records and progress in one operation
 * 
 * This fcunction is called by the email validation service
 * after each email completes. This recieves the entire array of
 * emails with their current statuses. This prevents race conditions
 * as there is no need to read/modify/write - just write the new state.
 * 
 * @param uploadId - Which upload to update
 * @param emailRecords - Current state of all emails
 * @param processedCount - How many finished so far
 */
export async function updateEmailRecords(
  uploadId: string,
  emailRecords: Array<{
    index: number;
    name: string;
    email: string;
    status: 'pending' | 'valid' | 'invalid';
    error?: string;
  }>,
  processedCount: number
): Promise<void> {
  const db = getDatabase();
  const key = buildKey(uploadId);
  const currentData = await db.get(key);

  if (!currentData) {
    logger.warn('Cannot update email records - status not found', { uploadId });
    return;
  }

  const status: UploadStatus = JSON.parse(currentData);
  
  // Replace entire email records array with new state
  status.emailRecords = emailRecords;
  
  // Update progress metrics
  status.processedRecords = processedCount;
  status.totalRecords = emailRecords.length;
  status.progress = emailRecords.length > 0
    ? Math.round((processedCount / emailRecords.length) * 100)
    : 0;

  // Extract failed records for final report
  status.details = emailRecords
    .filter(r => r.status === 'invalid')
    .map(r => ({
      name: r.name,
      email: r.email,
      error: r.error || 'Validation failed',
    }));
  status.failedRecords = status.details.length;

  await db.setWithExpiry(key, JSON.stringify(status), PROCESSING_TTL_SECONDS);
}

/**
 * Updates total record count after CSV parsing
 */
export async function setTotalRecords(
  uploadId: string,
  totalRecords: number
): Promise<void> {
  const db = getDatabase();
  const key = buildKey(uploadId);
  const currentData = await db.get(key);

  if (!currentData) {
    logger.warn('Cannot set total records - status not found', { uploadId });
    return;
  }

  const status: UploadStatus = JSON.parse(currentData);
  status.totalRecords = totalRecords;

  await db.setWithExpiry(key, JSON.stringify(status), PROCESSING_TTL_SECONDS);

  logger.debug('Total records set', { uploadId, totalRecords });
}

/**
 * Marks upload as successfully completed
 * 
 * @param uploadId - Which upload
 * @param totalRecords - How many emails total
 * @param failedRecords - Which ones failed (for report)
 */
export async function markCompleted(
  uploadId: string,
  totalRecords: number,
  failedRecords: FailedRecord[]
): Promise<void> {
  const db = getDatabase();
  const existingStatus = await getUploadStatus(uploadId);

  const status: UploadStatus = {
    uploadId,
    status: 'completed',
    totalRecords,
    processedRecords: totalRecords,
    failedRecords: failedRecords.length,
    progress: 100,
    details: failedRecords,
    emailRecords: existingStatus?.emailRecords,
    createdAt: existingStatus?.createdAt || new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };

  // Store with 24-hour TTL
  await db.setWithExpiry(
    buildKey(uploadId),
    JSON.stringify(status),
    COMPLETED_TTL_SECONDS
  );

  logger.info('Upload marked completed', {
    uploadId,
    totalRecords,
    failedCount: failedRecords.length,
    successCount: totalRecords - failedRecords.length,
  });
}

/**
 * Marks upload as failed due to error
 * 
 * @param uploadId - Which upload failed
 * @param errorMessage - What went wrong
 * @param partialResults - Optional results from before failure
 */
export async function markFailed(
  uploadId: string,
  errorMessage: string,
  partialResults?: {
    processedRecords: number;
    failedRecords: FailedRecord[];
  }
): Promise<void> {
  const db = getDatabase();
  const existingStatus = await getUploadStatus(uploadId);

  const status: UploadStatus = {
    uploadId,
    status: 'failed',
    // Preserve what we know from existing status
    totalRecords: existingStatus?.totalRecords || 0,
    processedRecords: partialResults?.processedRecords || existingStatus?.processedRecords || 0,
    failedRecords: partialResults?.failedRecords.length || existingStatus?.failedRecords || 0,
    progress: existingStatus?.progress || 0,
    details: partialResults?.failedRecords || existingStatus?.details || [],
    emailRecords: existingStatus?.emailRecords,
    createdAt: existingStatus?.createdAt || new Date().toISOString(),
    completedAt: new Date().toISOString(),
    error: errorMessage,
  };

  // Store with 24-hour TTL
  await db.setWithExpiry(
    buildKey(uploadId),
    JSON.stringify(status),
    COMPLETED_TTL_SECONDS
  );

  logger.error('Upload marked failed', { uploadId, error: errorMessage });
}