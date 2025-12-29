import dotenv from 'dotenv';
import { envSchema } from '../schemas';

// Load .env file before parsing
// Must happen before envSchema.parse() reads process.env
dotenv.config();

const env = envSchema.parse(process.env);

/**
 * Application configuration object
 */
export const config = {
  // Server configuration
  server: {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
  
    // Using getters here ensures they always reflect current state as 
    // these are computed properties that depend on nodeEnv
    get isDevelopment(): boolean {
      return this.nodeEnv === 'development';
    },
    get isProduction(): boolean {
      return this.nodeEnv === 'production';
    },
    get isTest(): boolean {
      return this.nodeEnv === 'test';
    },
  },

  // Redis DB configuration
  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
  },

  // File upload configuration
  upload: {
    maxFileSize: env.MAX_FILE_SIZE,
    uploadDir: env.UPLOAD_DIR,
    maxFiles: env.MAX_FILES,
  },

  // Processing configuration
  processing: {
    maxConcurrentValidations: env.MAX_CONCURRENT_VALIDATIONS,
    emailValidationTimeout: env.EMAIL_VALIDATION_TIMEOUT,
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },

  // Logging configuration
  logging: {
    level: env.LOG_LEVEL,
    dir: env.LOG_DIR,
  },
} as const;

// Export the parsed env for testing or direct access
export { env };