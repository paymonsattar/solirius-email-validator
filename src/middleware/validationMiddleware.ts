import { Request, Response, NextFunction } from 'express';
import { uploadIdParamSchema, formatZodErrors } from '../schemas';
import { ValidationError } from '../errors';

/**
 * Validates that a file was uploaded
 * 
 * Multer might succeed but with no file (wrong field name, etc.)
 * This catches cases where upload middleware passed but no file exists
 */
export function validateFileUpload(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  // Check for single file
  if (req.file) {
    return next();
  }

  // Check for multiple files
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    return next();
  }

  next(new ValidationError(
    'No file uploaded. Ensure the form field name is "file" or "files".'
  ));
}

/**
 * Validates uploadId route parameter
 */
export function validateUploadId(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const result = uploadIdParamSchema.safeParse(req.params);

  if (!result.success) {
    const errorMessage = formatZodErrors(result.error);

    return next(new ValidationError(`Invalid upload ID: ${errorMessage}`));
  }

  next();
}

/**
 * Validates Content-Type header for upload requests
 * 
 * File uploads must be multipart/form-data
 * Catch wrong content type before Multer tries to parse
 */
export function validateContentType(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const contentType = req.headers['content-type'];

  if (!contentType || !contentType.includes('multipart/form-data')) {
    return next(new ValidationError(
      'Invalid Content-Type. File uploads require multipart/form-data.'
    ));
  }

  next();
}