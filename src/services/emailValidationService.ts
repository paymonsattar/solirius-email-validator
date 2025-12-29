/**
 * Email Validation Service
 * 
 * Validates email addresses to check if they're deliverable before sending.
 * 
 * Uses mock validation for development (returns fake results with realistic delays).
 * In production, this will be replaced with a real email validation API.
 */

import { logger } from '../config';
import { getValidationLimiter } from '../utils';
import { DetailedValidationResult } from '../types';
import { withTimeout } from '../utils/timeout';

export enum EmailValidationRecordStatus {
  PENDING = 'pending',
  VALID = 'valid',
  INVALID = 'invalid'
}

/**
 * Interface for tracking the validation status of a single email
 */
export interface EmailValidationRecord {
  index: number; // Position in original CSV (for stable ordering)
  name: string; // Recipient name
  email: string; // Email address being validated
  status: EmailValidationRecordStatus;
  error?: string; // Why it failed (only present if invalid)
}

/**
 * Quick sanity check for email format
 */
function hasValidEmailFormat(email: string): boolean {
  const atIndex = email.indexOf('@');
  
  if (atIndex < 1) { // No @ or @ at the start
    return false; 
   }
  
  const dotAfterAt = email.indexOf('.', atIndex);
  if (dotAfterAt === -1) { // No dot after @
    return false;
  }

  if (dotAfterAt === atIndex + 1) { // Dot immediately after @ (@.com)
    return false;
  }

  if (dotAfterAt === email.length - 1) { // Ends with dot (gmail.)
    return false;
  }
  
  return true;
}

/**
 * Mock API call that can timeout or fail
 */
async function mockExternalApiCall(email: string, delay: number): Promise<{ valid: boolean }> {
  // Simulate 5% chance of API hanging
  if (Math.random() < 0.05) {
    await new Promise(() => {});// Never resolves
  }
  
  // Simulate 5% chance of API throwing an error
  if (Math.random() < 0.05) {
    throw new Error('External API unavailable');
  }
  
  await new Promise(resolve => setTimeout(resolve, delay));
  
  const valid = Math.random() > 0.15;

  return { valid };
}

/**
 * Pretends to call an email validation API, simulates a third
 * party vaidation API with 85% pass rate and realistic delays
 */
async function mockValidateEmail(
  name: string,
  email: string
): Promise<DetailedValidationResult> {
  try {
    const delay = 1000 + Math.random() * 9000;

    const result = await withTimeout(
      mockExternalApiCall(email, delay),
      delay + 2000, // Add 2 seconds to the mock delay for timeouts
      `Validation timed out for ${email}`
    );
    
    return {
      name,
      email,
      valid: result.valid,
      error: result.valid ? undefined : 'Mailbox not found',
    };
  } catch (error) {
    return {
      name,
      email,
      valid: false,
      error: error instanceof Error ? error.message : 'Validation service error',
    };
  }
}

/**
 * Validates a batch of emails with controlled concurrency. It's not viable
 * for us to send a large number of API requests at once as we would get 
 * rate limited. This function processes them in controlled batches.
 * 
 * @param records - Array of {name, email} pairs from CSV
 * @param uploadId - Unique ID for this upload (for logging and tracking)
 * @param onUpdate - Called after each completion with full state
 * @returns Array of results in same order as input
 */
export async function validateEmailBatch(
  records: Array<{ name: string; email: string }>,
  uploadId: string,
  onUpdate?: (emailRecords: EmailValidationRecord[], processedCount: number) => Promise<void>
): Promise<DetailedValidationResult[]> {
  const limiter = getValidationLimiter();
  const total = records.length;
  
  // Initialise all emails as pending
  // This creates the initial state before any validation starts
  const emailRecords: EmailValidationRecord[] = records.map((r, i) => ({
    index: i,
    name: r.name,
    email: r.email.trim(), // Remove accidental spaces
    status: EmailValidationRecordStatus.PENDING,
  }));

  // Pre-allocate results array, ensuring we can set results at any index
  // in any order
  const results: DetailedValidationResult[] = new Array(total);
  let processedCount = 0;

  // This ensures updates happen one at a time
  let updatePromise = Promise.resolve();

  logger.info('Starting batch validation', { uploadId, total });

  /**
   * Adds an update to the sequential queue
   */
  const queueUpdate = (index: number, result: DetailedValidationResult) => {
    updatePromise = updatePromise.then(async () => {
      processedCount++;
      results[index] = result;
      
      // Update the record's status
      emailRecords[index].status = result.valid ? EmailValidationRecordStatus.VALID : EmailValidationRecordStatus.INVALID;
      emailRecords[index].error = result.error;
      
      if (onUpdate) {
        // Pass a copy to prevent external modifications
        await onUpdate([...emailRecords], processedCount);
      }
    });
  };

  // Start all validations concurrently (but limited by concurrency control)
  // They all kick off at once, but the limiter ensures only N run at a time
  const promises = records.map(async (record, index) => {
    const email = record.email.trim();

    // Invalid format fails immediately, no API call
    if (!hasValidEmailFormat(email)) {
      const result: DetailedValidationResult = {
        name: record.name,
        email,
        valid: false,
        error: 'Invalid email format',
      };

      queueUpdate(index, result);
      return;
    }

    // Valid format goes through the API
    // limiter() ensures we don't overwhelm the API with too many requests
    await limiter(async () => {
      const result = await mockValidateEmail(record.name, email);

      queueUpdate(index, result);
    });
  });

  // Wait for all validations to complete
  await Promise.all(promises);
  
  // Wait for all queued updates to complete
  // This ensures the last update has finished writing to database
  await updatePromise;

  // Calculate final statistics for logging
  const validCount = results.filter(r => r.valid).length;
  const invalidCount = results.filter(r => !r.valid).length;

  logger.info('Batch validation completed', { 
    uploadId, 
    total, 
    valid: validCount, 
    invalid: invalidCount 
  });

  return results;
}