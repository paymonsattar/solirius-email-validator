import { InMemoryDatabase } from '../../src/database/InMemoryDatabase';
import { createDatabase, closeDatabase, setDatabase, getDatabase } from '../../src/database/factory';
import { IDatabase } from '../../src/database/IDatabase';

describe('InMemoryDatabase', () => {
  let db: InMemoryDatabase;

  beforeEach(() => {
    db = new InMemoryDatabase();
  });

  afterEach(async () => {
    await db.close();
  });

  describe('basic operations', () => {
    it('should set and get a value', async () => {
      await db.set('key1', 'value1');
      const result = await db.get('key1');

      expect(result).toBe('value1');
    });

    it('should return null for non-existent key', async () => {
      const result = await db.get('non-existent');

      expect(result).toBeNull();
    });

    it('should overwrite existing value', async () => {
      await db.set('key1', 'value1');
      await db.set('key1', 'value2');
      const result = await db.get('key1');

      expect(result).toBe('value2');
    });

    it('should delete a value', async () => {
      await db.set('key1', 'value1');
      await db.delete('key1');
      const result = await db.get('key1');

      expect(result).toBeNull();
    });

    it('should handle deleting non-existent key', async () => {
      await expect(db.delete('non-existent')).resolves.not.toThrow();
    });
  });

  describe('TTL functionality', () => {
    it('should set value with expiry', async () => {
      await db.setWithExpiry('key1', 'value1', 1); // 1 second TTL
      
      // Should exist immediately
      const immediate = await db.get('key1');
      expect(immediate).toBe('value1');
    });

    it('should expire value after TTL', async () => {
      await db.setWithExpiry('key1', 'value1', 1); // 1 second TTL
      
      // Wait longer than TTL (1.5 seconds to be safe)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const result = await db.get('key1');
      expect(result).toBeNull();
    });
  });

  describe('health check', () => {
    it('should report healthy', async () => {
      const healthy = await db.isHealthy();
      expect(healthy).toBe(true);
    });
  });

  describe('test helpers', () => {
    it('should clear all data', async () => {
      await db.set('key1', 'value1');
      await db.set('key2', 'value2');
      
      db.clear();
      
      expect(await db.get('key1')).toBeNull();
      expect(await db.get('key2')).toBeNull();
    });

    it('should return all keys', async () => {
      await db.set('key1', 'value1');
      await db.set('key2', 'value2');
      
      const keys = db.keys();
      
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    it('should return size', async () => {
      await db.set('key1', 'value1');
      await db.set('key2', 'value2');
      
      expect(db.size()).toBe(2);
    });
  });
});

describe('Database Factory', () => {
  afterEach(async () => {
    await closeDatabase();
  });

  describe('createDatabase', () => {
    it('should create InMemoryDatabase in test environment', async () => {
      const db = await createDatabase();

      expect(db).toBeInstanceOf(InMemoryDatabase);
    });
  });

  describe('setDatabase / getDatabase', () => {
    it('should allow setting custom database implementation', async () => {
      const mockDb: IDatabase = {
        get: jest.fn().mockResolvedValue('value'),
        set: jest.fn().mockResolvedValue(undefined),
        setWithExpiry: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
        isHealthy: jest.fn().mockResolvedValue(true),
        close: jest.fn().mockResolvedValue(undefined),
      };

      setDatabase(mockDb);
      const db = getDatabase();

      expect(db).toBe(mockDb);
    });
  });
});