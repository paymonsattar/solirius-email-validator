import request from 'supertest';
import path from 'path';
import { createApp } from '../../src/app';
import { createDatabase, closeDatabase, getDatabase } from '../../src/database';
import { InMemoryDatabase } from '../../src/database/InMemoryDatabase';

describe('API Integration Tests', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    await createDatabase();
    app = createApp();
  });

  afterAll(async () => {
    // Wait for background processing to complete before closing database
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await closeDatabase();
  });

  beforeEach(() => {
    // Clear database between tests
    const db = getDatabase();
    if (db instanceof InMemoryDatabase) {
      db.clear();
    }
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /upload', () => {
    const fixturesDir = path.join(__dirname, '../fixtures');

    it('should accept valid CSV file and return uploadId', async () => {
      const response = await request(app)
        .post('/upload')
        .attach('file', path.join(fixturesDir, 'valid.csv'));

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('uploadId');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Processing started');
    });

    it('should reject request without file', async () => {
      const response = await request(app)
        .post('/upload');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /status/:uploadId', () => {
    it('should return 404 for non-existent upload', async () => {
      const response = await request(app)
        .get('/status/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return status for valid upload', async () => {
      // First upload a file
      const uploadResponse = await request(app)
        .post('/upload')
        .attach('file', path.join(__dirname, '../fixtures/valid.csv'));

      const uploadId = uploadResponse.body.uploadId;

      // Then check status
      const statusResponse = await request(app)
        .get(`/status/${uploadId}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body).toHaveProperty('uploadId', uploadId);
      expect(statusResponse.body).toHaveProperty('status');
    });

    it('should return progress percentage for processing upload', async () => {
      const uploadResponse = await request(app)
        .post('/upload')
        .attach('file', path.join(__dirname, '../fixtures/valid.csv'));

      const uploadId = uploadResponse.body.uploadId;

      // Immediately check status (should be processing)
      const statusResponse = await request(app)
        .get(`/status/${uploadId}`);

      // Status could be processing or completed depending on timing
      expect(['processing', 'completed']).toContain(statusResponse.body.status);
      
      if (statusResponse.body.status === 'processing') {
        expect(statusResponse.body).toHaveProperty('progress');
      }
    });
  });

  describe('GET /status/:uploadId/detailed', () => {
    it('should return detailed status with email records', async () => {
      const uploadResponse = await request(app)
        .post('/upload')
        .attach('file', path.join(__dirname, '../fixtures/valid.csv'));

      const uploadId = uploadResponse.body.uploadId;

      // Wait a bit for processing to start
      await new Promise(resolve => setTimeout(resolve, 200));

      const statusResponse = await request(app)
        .get(`/status/${uploadId}/detailed`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body).toHaveProperty('uploadId');
      expect(statusResponse.body).toHaveProperty('emailRecords');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route');

      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/upload')
        .set('Content-Type', 'application/json')
        .send('not valid json{');

      // Should not crash, return appropriate error
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /upload/multiple', () => {
    const fixturesDir = path.join(__dirname, '../fixtures');

    it('should accept multiple CSV files', async () => {
      const response = await request(app)
        .post('/upload/multiple')
        .attach('files', path.join(fixturesDir, 'valid.csv'))
        .attach('files', path.join(fixturesDir, 'mixed.csv'));

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('uploads');
      expect(response.body.uploads).toHaveLength(2);
      expect(response.body).toHaveProperty('message');
      
      response.body.uploads.forEach((upload: { uploadId: string; message: string }) => {
        expect(upload).toHaveProperty('uploadId');
        expect(upload).toHaveProperty('message');
      });
    });
  });
});