import multer, { FileFilterCallback, StorageEngine } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { config, logger } from '../config';
import { ValidationError } from '../errors';

const uploadDir = config.upload.uploadDir;

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  
  logger.info('Created upload directory', { path: uploadDir });
}

/**
 * Disk storage configuration
 */
const storage: StorageEngine = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, uploadDir);
  },

  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const uniqueId = uuidv4();
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${uniqueId}-${timestamp}-${sanitizedName}`;
    cb(null, filename);
  },
});

/**
 * File filter - only allow CSV files
 */
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const allowedMimeTypes = ['text/csv', 'application/csv', 'text/plain'];
  const allowedExtensions = ['.csv'];

  const ext = path.extname(file.originalname).toLowerCase();
  const mimeTypeValid = allowedMimeTypes.includes(file.mimetype);
  const extensionValid = allowedExtensions.includes(ext);

  if (mimeTypeValid || extensionValid) {
    cb(null, true);
  } else {
    logger.warn('File rejected: invalid type', {
      originalName: file.originalname,
      mimeType: file.mimetype,
      extension: ext,
    });

    cb(new ValidationError(
      `Invalid file type. Only CSV files are allowed. Received: ${file.mimetype}`
    ));
  }
};

/**
 * Create configured Multer instance
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: config.upload.maxFiles,
  },
});

/**
 * Middleware for single file upload
 */
export const singleFileUpload = upload.single('file');

/**
 * Middleware for multiple file upload
 */
export const multipleFileUpload = upload.array('files', config.upload.maxFiles);