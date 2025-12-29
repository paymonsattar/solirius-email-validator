import { Router } from 'express';
import { handleSingleUpload, handleMultipleUpload } from '../controllers';
import {
  singleFileUpload,
  multipleFileUpload,
  validateFileUpload,
  validateContentType,
  uploadRateLimiter,
} from '../middleware';

const router = Router();

/**
 * POST /upload
 * 
 * Upload a single CSV file for email validation.
 */
router.post(
  '/',
  uploadRateLimiter, // Rate limiter - prevent abuse
  validateContentType, // Content-Type validation - ensure multipart/form-data
  singleFileUpload, // Multer - parse file from request
  validateFileUpload, // File validation - ensure file was uploaded
  handleSingleUpload // Controller - handle business logic
);

/**
 * POST /upload/multiple
 * 
 * Upload multiple CSV files for email validation.
 */
router.post(
  '/multiple',
  uploadRateLimiter, // Rate limiter - prevent abuse
  validateContentType, // Content-Type validation - ensure multipart/form-data
  multipleFileUpload, // Multer - parse file from request
  validateFileUpload, // File validation - ensure file was uploaded
  handleMultipleUpload // Controller - handle business logic
);

export default router;