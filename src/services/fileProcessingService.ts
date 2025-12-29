/**
 * File Processing Service
 * 
 * This service works as an orchestrator that coordinates the entire
 * file processing workflow. It takes a CSV file upload and manages 
 * it from start to finish.
 */

import { parseCSVFile, deleteFile } from '../utils';
import { validateEmailBatch } from './emailValidationService';
import * as UploadStatusService from './uploadStatusService';
import { FailedRecord } from '../schemas';
import { DetailedValidationResult } from '../types';
import { FileProcessingError } from '../errors';
import { logger } from '../config';

/**
 * Filters out and formats the failed validations
 */
function extractFailedRecords(results: DetailedValidationResult[]): FailedRecord[] {
  return results
    .filter(result => !result.valid) // Only failures
    .map(result => ({
      name: result.name,
      email: result.email,
      error: result.error || 'Validation failed', // Fallback error message
    }));
}

/**
 * Processes an uploaded CSV file from start to finish
 * 
 * @param uploadId - Unique identifier (used for tracking and logging)
 * @param filePath - Where the uploaded CSV lives on disk
 */
export async function processFile(uploadId: string, filePath: string): Promise<void> {
  logger.info('Starting file processing', { uploadId, filePath });

  try {
    // ==========================================================================
    // STEP 1: Parse CSV file into rows
    // ==========================================================================
    logger.debug('Parsing CSV file', { uploadId });
    const { rows, totalRecords } = await parseCSVFile(filePath);

    // Empty file check - can't validate zero emails
    if (totalRecords === 0) {
      await UploadStatusService.markFailed(
        uploadId,
        'CSV file contains no valid records'
      );

      // Not throwing here - empty file is a valid "failure" case
      // Client gets clean error message via status endpoint
      return;
    }

    // ==========================================================================
    // STEP 2: Set up real-time tracking for each email
    // ==========================================================================
    // This creates database records for each email so the UI can show:
    // - "Email 1: pending"
    // - "Email 2: validating..."
    // - "Email 3: valid ✓"
    await UploadStatusService.initialiseEmailRecords(uploadId, rows);

    logger.info('CSV parsed and email records initialised', { uploadId, totalRecords });

    // ==========================================================================
    // STEP 3: Validate all emails with real-time progress updates
    // ==========================================================================
    // The callback fires after each email completes, updating the database
    // This lets the UI show progress as it happens, not just at the end
    const validationResults = await validateEmailBatch(
      rows,
      uploadId,
      // This function runs after each email is validated
      async (emailRecords, processedCount) => {
        await UploadStatusService.updateEmailRecords(uploadId, emailRecords, processedCount);
      }
    );

    // ==========================================================================
    // STEP 4: Extract just the failures for the final report
    // ==========================================================================
    const failedRecords = extractFailedRecords(validationResults);

    // ==========================================================================
    // STEP 5: Mark the upload as complete with final statistics
    // ==========================================================================
    await UploadStatusService.markCompleted(uploadId, totalRecords, failedRecords);

    logger.info('File processing completed', {
      uploadId,
      totalRecords,
      successCount: totalRecords - failedRecords.length,
      failedCount: failedRecords.length,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('File processing failed', {
      uploadId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Update database so client sees the failure
    await UploadStatusService.markFailed(uploadId, errorMessage);

    // Re-throw so caller knows processing failed
    throw new FileProcessingError(errorMessage, 500, uploadId);

  } finally {
    // ==========================================================================
    // CLEANUP - Always runs, success or failure
    // ==========================================================================
    deleteFile(filePath);
    logger.debug('File cleanup completed', { uploadId, filePath });
  }
}

/**
 * Starts file processing in the background
 * 
 * @param uploadId - Unique identifier for tracking
 * @param filePath - Path to the uploaded file
 */
export async function initiateProcessing(
  uploadId: string,
  filePath: string
): Promise<void> {
  // We create the initial status so client can immediately start polling
  // Status starts as "processing" with 0% progress
  await UploadStatusService.createUploadStatus(uploadId, 0);

  // Start processing but we don't for it to finish
  // Client will poll /status to see progress
  processFile(uploadId, filePath).catch((error) => {
    // This catch is a safety net - prevents unhandled rejection
    // The error is already logged inside processFile()
    logger.error('Background processing error', {
      uploadId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  });
}

/**
 * Starts processing for multiple files at once
 */
export async function processMultipleFiles(
  files: Array<{ uploadId: string; filePath: string }>
): Promise<void> {
  logger.info('Starting multiple file processing', { fileCount: files.length });

  // Create ALL initial statuses first
  await Promise.all(
    files.map(file => UploadStatusService.createUploadStatus(file.uploadId, 0))
  );

  // Start processing each file independently in the background
  files.forEach(file => {
    processFile(file.uploadId, file.filePath).catch((error) => {
      logger.error('Background processing error', {
        uploadId: file.uploadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });
  });
}