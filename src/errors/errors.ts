export class ValidationError extends Error {
  public readonly statusCode: number;
  public readonly isOperational = true;

  constructor(message: string, statusCode: number = 400) {
    super(message);

    this.name = 'ValidationError';
    this.statusCode = statusCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Represents errors during file processing. Carries uploadId for context in
 * logs and responses.
 */
export class FileProcessingError extends Error {
  public readonly statusCode: number;
  public readonly isOperational = true;
  
  // Upload ID associated with this error, allows correlating errors with specific
  // uploads in logs
  public readonly uploadId?: string;

  constructor(message: string, statusCode: number = 500, uploadId?: string) {
    super(message);

    this.name = 'FileProcessingError';
    this.statusCode = statusCode;
    this.uploadId = uploadId;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class DatabaseError extends Error {
  public readonly statusCode = 503; // Service Unavailable
  public readonly isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
    
    Error.captureStackTrace(this, this.constructor);
  }
}