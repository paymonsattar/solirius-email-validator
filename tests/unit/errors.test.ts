import { ValidationError, FileProcessingError, DatabaseError } from '../../src/errors';

describe('Error Classes', () => {
  describe('ValidationError', () => {
    it('should create error with message and default status code', () => {
      const error = new ValidationError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('ValidationError');
    });

    it('should create error with custom status code', () => {
      const error = new ValidationError('Not found', 404);

      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
    });

    it('should be instance of Error', () => {
      const error = new ValidationError('Test');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
    });

    it('should have stack trace', () => {
      const error = new ValidationError('Test');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ValidationError');
    });
  });

  describe('FileProcessingError', () => {
    it('should create error with message, status code, and uploadId', () => {
      const error = new FileProcessingError('Processing failed', 500, 'upload-123');

      expect(error.message).toBe('Processing failed');
      expect(error.statusCode).toBe(500);
      expect(error.uploadId).toBe('upload-123');
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('FileProcessingError');
    });

    it('should be instance of Error', () => {
      const error = new FileProcessingError('Test', 500, 'id');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FileProcessingError);
    });
  });

  describe('DatabaseError', () => {
    it('should create error with message and default status code 503', () => {
      const error = new DatabaseError('Connection failed');

      expect(error.message).toBe('Connection failed');
      expect(error.statusCode).toBe(503);
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('DatabaseError');
    });

    it('should be instance of Error', () => {
      const error = new DatabaseError('Test');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DatabaseError);
    });
  });

  describe('isOperational flag', () => {
    it('should mark ValidationError as operational', () => {
      const error = new ValidationError('Test');
      expect(error.isOperational).toBe(true);
    });

    it('should mark FileProcessingError as operational', () => {
      const error = new FileProcessingError('Test', 500, 'id');
      expect(error.isOperational).toBe(true);
    });

    it('should mark DatabaseError as operational', () => {
      const error = new DatabaseError('Test');
      expect(error.isOperational).toBe(true);
    });

    it('should distinguish from programming errors', () => {
      const operationalError = new ValidationError('Bad input');
      const programmingError = new TypeError('undefined is not a function');

      expect(operationalError.isOperational).toBe(true);
      expect((programmingError as any).isOperational).toBeUndefined();
    });
  });
});