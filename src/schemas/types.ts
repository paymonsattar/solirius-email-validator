/**
 * Types Inferred from Zod Schemas
 */
import { z } from 'zod';
import {
  uuidSchema,
  emailSchema,
  csvRowSchema,
  parsedCsvSchema,
  uploadStatusTypeSchema,
  failedRecordSchema,
  uploadStatusSchema,
  uploadIdParamSchema,
  envSchema,
} from './schemas';

// Primitive types
export type UUID = z.infer<typeof uuidSchema>;
export type Email = z.infer<typeof emailSchema>;

// CSV types
export type CsvRow = z.infer<typeof csvRowSchema>;
export type ParsedCsv = z.infer<typeof parsedCsvSchema>;

// Upload status types
export type UploadStatusType = z.infer<typeof uploadStatusTypeSchema>;
export type FailedRecord = z.infer<typeof failedRecordSchema>;
export type UploadStatus = z.infer<typeof uploadStatusSchema>;

// Request types
export type UploadIdParam = z.infer<typeof uploadIdParamSchema>;

// Config types
export type EnvConfig = z.infer<typeof envSchema>;