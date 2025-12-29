import { z } from 'zod';

export const uuidSchema = z
  .uuid({ message: 'Must be a valid UUID format' });

export const emailSchema = z
  .email({ message: 'Invalid email format' })

export const nonEmptyStringSchema = z
  .string()
  .trim()
  .min(1, { message: 'Cannot be empty' });

// =============================================================================
// CSV SCHEMAS
// Validation for parsed CSV data
// =============================================================================

/**
 * Single CSV row schema
 */
export const csvRowSchema = z.object({
  name: nonEmptyStringSchema,
  email: z.string().trim(), // Don't validate format here - service does that
});

/**
 * Parsed CSV result
 */
export const parsedCsvSchema = z.object({
  rows: z.array(csvRowSchema),
  totalRecords: z.number().int().min(0),
});

// =============================================================================
// UPLOAD STATUS SCHEMAS
// These define the structure of data stored in the database
// =============================================================================

/**
 * Upload status states
 */
export const uploadStatusTypeSchema = z.enum(['processing', 'completed', 'failed']);

/**
 * Failed record details
 */
export const failedRecordSchema = z.object({
  name: z.string(),
  email: z.string(),
  error: z.string(),
});

/**
 * Defines the complete shape of upload tracking data
 * This schema is used to validate data when reading from database,
 * ensuring data integrity even if the database is corrupted or modified
 */
export const uploadStatusSchema = z.object({
  uploadId: uuidSchema,
  status: uploadStatusTypeSchema,
  totalRecords: z.number().int().min(0),
  processedRecords: z.number().int().min(0),
  failedRecords: z.number().int().min(0),
  progress: z.number().int().min(0).max(100),
  details: z.array(failedRecordSchema),
  emailRecords: z.array(z.object({
    index: z.number().int().min(0),
    name: z.string(),
    email: z.string(),
    status: z.enum(['pending', 'validating', 'valid', 'invalid']),
    error: z.string().optional(),
  })).optional(),
  createdAt: z.string(), // ISO datetime string
  completedAt: z.string().optional(),
  error: z.string().optional(),
});

// =============================================================================
// REQUEST VALIDATION SCHEMAS
// These validate incoming HTTP requests
// =============================================================================

/**
 * Upload ID path parameter
 */
export const uploadIdParamSchema = z.object({
  uploadId: uuidSchema,
});

// =============================================================================
// ENVIRONMENT CONFIGURATION SCHEMA
// Validates and provides defaults for environment variables
// =============================================================================

export const envSchema = z.object({
  // Server
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database (Redis)
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
  REDIS_PASSWORD: z.string().optional(),
  
  // File Upload
  MAX_FILE_SIZE: z.coerce.number().int().min(1).default(5 * 1024 * 1024), // 5MB
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILES: z.coerce.number().int().min(1).max(100).default(10),
  
  // Processing
  MAX_CONCURRENT_VALIDATIONS: z.coerce.number().int().min(1).max(100).default(5),
  EMAIL_VALIDATION_TIMEOUT: z.coerce.number().int().min(0).default(100),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(10),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_DIR: z.string().default('logs'),
});