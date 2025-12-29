/**
 * Jest Test Setup
 */
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.MAX_FILE_SIZE = '10485760';
process.env.UPLOAD_DIR = './uploads';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
process.env.CONCURRENT_VALIDATIONS = '5';
process.env.EMAIL_VALIDATION_TIMEOUT = '100';
process.env.LOG_LEVEL = 'error';

jest.setTimeout(30000);

beforeAll(async () => {});
afterAll(async () => {});
beforeEach(() => {
  jest.clearAllMocks();
});