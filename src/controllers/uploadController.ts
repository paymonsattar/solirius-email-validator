import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { generateUploadId } from '../utils';
import { FileProcessingService } from '../services';
import { ValidationError } from '../errors';
import { logger } from '../config';
import { UploadResponse, MultiUploadResponse, FileUploadInfo } from '../types';

/**
 * Handles single file upload
 * 
 * POST /upload
 * 
 * Returns 202 Accepted but processing happens asynchronously
 * Client should poll /status/:uploadId for results
 */
export async function handleSingleUpload(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Multer might fail silently or file field might be wrong
    if (!req.file) {
      throw new ValidationError('No file uploaded. Use field name "file" for upload.');
    }

    const file = req.file;
    const uploadId = generateUploadId();
    
    // This ensures absolute path for file operations
    const filePath = path.resolve(file.path);

    logger.info('File upload received', {
      uploadId,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    });

    // We insure initial status is created before responding, the
    // Processing itself runs in the background
    await FileProcessingService.initiateProcessing(uploadId, filePath);

    const response: UploadResponse = {
      uploadId,
      message: 'File uploaded successfully. Processing started.',
    };

    res.status(202).json(response);

  } catch (error) {
    next(error);
  }
}

/**
 * Handles multiple file upload
 * 
 * POST /upload/multiple
 * 
 * This endpoint is seperate to the single file upload as it has a 
 * different request and response structure therefore it's better we 
 * seperate the two controllers to avoid over complicating a single endpoint
 */
export async function handleMultipleUpload(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw new ValidationError('No files uploaded. Use field name "files" for multiple uploads.');
    }

    const files = req.files as Express.Multer.File[];

    const fileInfos: FileUploadInfo[] = files.map(file => ({
      uploadId: generateUploadId(),
      filePath: path.resolve(file.path),
      originalName: file.originalname,
      size: file.size,
    }));

    logger.info('Multiple files upload received', {
      fileCount: files.length,
      files: fileInfos.map(f => ({
        uploadId: f.uploadId,
        name: f.originalName,
        size: f.size,
      })),
    });

    // Start processing all files
    await FileProcessingService.processMultipleFiles(fileInfos);

    const response: MultiUploadResponse = {
      uploads: fileInfos.map(f => ({
        uploadId: f.uploadId,
        message: `File '${f.originalName}' uploaded. Processing started.`,
      })),
      message: `${files.length} file(s) uploaded successfully. Processing started.`,
    };

    res.status(202).json(response);

  } catch (error) {
    next(error);
  }
}