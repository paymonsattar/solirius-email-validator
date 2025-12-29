/**
 * Database Interface
 * 
 * This is the interface that defines the contract for database
 * operations, any database operation must satisfy this interface.
 * 
 * To use a different database:
 * 
 * 1. Create a new class implementing IDatabase
 * 2. Update the factory function in index.ts
 */
export interface IDatabase {
  /**
   * Get a value by key
   * 
   * @returns The value as string, or null if not found
   */
  get(key: string): Promise<string | null>;

  /**
   * Set a value
   */
  set(key: string, value: string): Promise<void>;

  /**
   * Set a value with automatic expiration
   */
  setWithExpiry(key: string, value: string, ttlSeconds: number): Promise<void>;

  /**
   * Delete a key
   * 
   * @returns true if key existed and was deleted
   */
  delete(key: string): Promise<boolean>;

  /**
   * Check if database connection is healthy
   */
  isHealthy(): Promise<boolean>;

  /**
   * Close database connection
   */
  close(): Promise<void>;
}