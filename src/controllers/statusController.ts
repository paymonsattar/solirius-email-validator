/**
 * Status Controller
 * 
 * Used by clients to poll for processing progress and results.
 * 
 * We used polling over webhooks as:
 * 1. Simpler implementation - theres no callback URLs or persistent connections
 * 2. Resilient - client can poll at any interval, retry on failure
 * 3. Stateless - server doesn't track client connections
 * 4. Works everywhere - even behind firewalls/NATs
 */
import { Request, Response, NextFunction } from 'express';
import { UploadStatusService } from '../services';
import { ValidationError } from '../errors';
import { logger } from '../config';

/**
 * Response for processing status
 */
interface ProcessingStatusResponse {
  uploadId: string;
  status: 'processing';
  progress: string;
}

/**
 * Response for completed status
 */
interface CompletedStatusResponse {
  uploadId: string;
  status: 'completed';
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  details: Array<{ name: string; email: string; error: string }>;
}

/**
 * Response for failed status
 */
interface FailedStatusResponse {
  uploadId: string;
  status: 'failed';
  error: string;
  processedRecords: number;
  failedRecords: number;
  details: Array<{ name: string; email: string; error: string }>;
}

/**
 * Gets upload status
 * 
 * GET /status/:uploadId
 */
export async function getStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { uploadId } = req.params;

    const status = await UploadStatusService.getUploadStatus(uploadId);

    // Upload doesn't exist or has expired
    if (!status) {
      throw new ValidationError(
        `Upload not found: ${uploadId}. It may have expired or never existed.`,
        404
      );
    }

    logger.debug('Status requested', {
      uploadId,
      status: status.status,
      progress: status.progress,
    });

    // Different response shapes for different statuses
    let response: ProcessingStatusResponse | CompletedStatusResponse | FailedStatusResponse;

    switch (status.status) {
      // Processing: just progress percentage
      case 'processing':
        response = {
          uploadId: status.uploadId,
          status: 'processing',
          progress: `${status.progress}%`,
        };
        break;

      // Completed: full results with failed record details
      case 'completed':
        response = {
          uploadId: status.uploadId,
          status: 'completed',
          totalRecords: status.totalRecords,
          processedRecords: status.processedRecords,
          failedRecords: status.failedRecords,
          details: status.details,
        };
        break;

      // Failed: error message and any partial results
      case 'failed':
        response = {
          uploadId: status.uploadId,
          status: 'failed',
          error: status.error || 'Processing failed',
          processedRecords: status.processedRecords,
          failedRecords: status.failedRecords,
          details: status.details,
        };
        break;
    }

    res.status(200).json(response);

  } catch (error) {
    next(error);
  }
}

/**
 * Gets detailed status with all metadata
 * 
 * GET /status/:uploadId/detailed
 * 
 * Regular endpoint returns formatted response, this returns raw data. 
 * Incase a client needs full status object or detailed view
 */
export async function getDetailedStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { uploadId } = req.params;

    const status = await UploadStatusService.getUploadStatus(uploadId);

    if (!status) {
      throw new ValidationError(`Upload not found: ${uploadId}`, 404);
    }

    // Raw data for debugging or detailed views
    res.status(200).json(status);

  } catch (error) {
    next(error);
  }
}