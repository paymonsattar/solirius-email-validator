import { Router } from 'express';
import { getStatus, getDetailedStatus } from '../controllers';
import { validateUploadId, statusRateLimiter } from '../middleware';

const router = Router();

/**
 * GET /status/:uploadId
 * 
 * Get processing status for an upload.
 * 
 * Returns different response shapes based on status:
 * - processing: { uploadId, status, progress }
 * - completed: { uploadId, status, totalRecords, failedRecords, details }
 * - failed: { uploadId, status, error, details }
 */
router.get(
  '/:uploadId',
  statusRateLimiter,
  validateUploadId,
  getStatus
);

/**
 * GET /status/:uploadId/detailed
 * 
 * Get full status object with all metadata.
 * Includes createdAt, completedAt, and other internal fields.
 */
router.get(
  '/:uploadId/detailed',
  statusRateLimiter,
  validateUploadId,
  getDetailedStatus
);

export default router;