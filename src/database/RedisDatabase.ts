/**
 * Redis Database Implementation
 * 
 * Connects the application to Redis for fast, in-memory data storage.
 * Implements the IDatabase interface so other code doesn't care if it's
 * Redis, MongoDB, PostgreSQL, etc.
 */

import { createClient, RedisClientType } from 'redis';
import { IDatabase } from './IDatabase';
import { logger } from '../config/logger';

export class RedisDatabase implements IDatabase {
  // Client instance - represents the connection to Redis server
  private client: RedisClientType | null = null;
  
  // Connection state - prevents double-connecting
  private isConnected = false;

  /**
   * Creates a Redis database instance
   * 
   * @param host - Redis server address (e.g., "localhost", "redis.example.com")
   * @param port - Redis port (usually 6379)
   * @param password - Optional password for authenticated Redis
   */
  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly password?: string
  ) {}

  /**
   * Establishes connection to Redis server
   */
  async connect(): Promise<void> {
    // Prevent multiple connections
    if (this.client && this.isConnected) {
      logger.debug('Redis already connected, skipping');

      return;
    }

    this.client = createClient({
      socket: {
        host: this.host,
        port: this.port,
        
        // Auto-reconnect strategy
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            logger.error('Redis max reconnection attempts reached');

            return new Error('Max reconnection attempts reached');
          }
          
          const delay = Math.min(retries * 100, 3000);

          logger.warn(`Redis reconnecting in ${delay}ms`, { attempt: retries });

          return delay;
        },
      },
      password: this.password,
    });

    // =========================================================================
    // EVENT HANDLERS - Monitor connection health
    // =========================================================================
    
    /**
     * 'error' event: Something went wrong
     */
    this.client.on('error', (err: Error) => {
      logger.error('Redis client error', { error: err.message });

      this.isConnected = false;
    });

    /**
     * 'ready' event: Successfully connected and ready for commands
     * 
     * This fires after initial connection and after successful reconnection
     */
    this.client.on('ready', () => {
      logger.info('Redis client ready');

      this.isConnected = true;
    });

    /**
     * 'end' event: Connection closed (intentionally or by error)
     * 
     * Could be from calling quit(), or from connection loss
     */
    this.client.on('end', () => {
      logger.info('Redis client disconnected');

      this.isConnected = false;
    });

    // Actually connect to the server
    await this.client.connect();

    this.isConnected = true;

    logger.info('Redis connected', { host: this.host, port: this.port });
  }

  /**
   * Gets a value by key
   * 
   * RETURNS:
   * - The string value if key exists
   * - null if key doesn't exist or expired
   */
  async get(key: string): Promise<string | null> {
    this.ensureConnected();
    return this.client!.get(key);
  }

  /**
   * Sets a value by key (no expiration)
   * 
   * We should use setWithExpiry() instead for most cases!
   * Keys without TTL live forever and waste memory.
   * 
   * Only use this when:
   * - Configuration that never expires
   * - Permanent feature flags
   * - Reference data that's always needed
   */
  async set(key: string, value: string): Promise<void> {
    this.ensureConnected();

    await this.client!.set(key, value);
  }

  /**
   * Sets a value with automatic expiration
   * 
   * WHY SETEX (not SET + EXPIRE):
   * setEx is atomic - value and TTL set together in one operation.
   * 
   * With separate commands, there's a tiny race condition:
   * 1. SET key value
   * 2. [CRASH HERE - key lives forever]
   * 3. EXPIRE key 3600
   * 
   * setEx prevents this - either both succeed or neither do.
   * 
   * @param key - The key to store
   * @param value - The value to store
   * @param ttlSeconds - How many seconds until auto-delete
   */
  async setWithExpiry(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.ensureConnected();
    await this.client!.setEx(key, ttlSeconds, value);
  }

  /**
   * Deletes a key
   * 
   * RETURNS:
   * - true if key was deleted
   * - false if key didn't exist
   */
  async delete(key: string): Promise<boolean> {
    this.ensureConnected();

    const result = await this.client!.del(key);
    // Redis DEL returns count of keys deleted (usually 0 or 1)
    return result > 0;
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    // Can't be healthy if not connected
    if (!this.client || !this.isConnected) {
      return false;
    }
    
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';  // Standard Redis PING response
    } catch {
      // Any error (timeout, connection lost, etc.) = unhealthy
      return false;
    }
  }

  /**
   * Gracefully closes the connection
   * 
   * QUIT vs DISCONNECT:
   * - quit(): Waits for pending commands to finish, then closes cleanly
   * - disconnect(): Immediately closes, pending commands may fail
   * 
   * We use quit() to ensure no data loss.
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit(); // Graceful shutdown
      
      this.client = null;
      this.isConnected = false;

      logger.info('Redis connection closed');
    }
  }

  /**
   * Safety check before every operation
   * 
   * Without connection, operations would throw cryptic errors like:
   * "Cannot read property 'get' of null"
   * 
   * This provides a clear error message:
   * "Database not connected. Call connect() first."
   */
  private ensureConnected(): void {
    if (!this.client || !this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }
}