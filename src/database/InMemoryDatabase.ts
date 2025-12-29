import { IDatabase } from './IDatabase';

/**
 * Internal structure for stored values
 */
interface StoredValue {
  value: string;
  expiresAt?: number; // Unix timestamp in milliseconds
}

/**
 * In-Memory Database Implementation
 * 
 * This is an example of using dependancy injection and our
 * IDatabase contract to implement a different database method. 
 * 
 * We've implemented this in-memory Map db for testing and dev
 * without having to use Redis.
 * 
 * Just set NODE_ENV=test to use this.
 */
export class InMemoryDatabase implements IDatabase {
  private data = new Map<string, StoredValue>();
  private connected = true;

  async get(key: string): Promise<string | null> {
    const entry = this.data.get(key);

    if (!entry) {
      return null;
    }

    // We don't need background cleanup - just check when accessed
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.data.delete(key);

      return null;
    }

    return entry.value;
  }

  async set(key: string, value: string): Promise<void> {
    this.data.set(key, { value });
  }

  async setWithExpiry(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.data.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.data.delete(key);
  }

  async isHealthy(): Promise<boolean> {
    return this.connected;
  }

  async close(): Promise<void> {
    this.data.clear();
    this.connected = false;
  }

  // ==========================================================================
  // TEST HELPER METHODS
  // These are not part of IDatabase interface, only used in tests
  // ==========================================================================

  /**
   * Clears all data without closing the connection, useful for resetting state
   * between tests without recreating the instance
   */
  clear(): void {
    this.data.clear();
  }

  /**
   * Gets all keys, Useful for test assertions about what was stored
   */
  keys(): string[] {
    return Array.from(this.data.keys());
  }

  /**
   * Gets count of stored items, Quick way to verify expected number of
   * items in tests
   */
  size(): number {
    return this.data.size;
  }
}