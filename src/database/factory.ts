import { IDatabase } from './IDatabase';
import { RedisDatabase } from './RedisDatabase';
import { InMemoryDatabase } from './InMemoryDatabase';
import { config } from '../config/env';
import { logger } from '../config/logger';

// Singleton database instance
let database: IDatabase | null = null;

/**
 * Creates and initialises the database instance
 * 
 * This function is called one on application startup, if called after it 
 * will return the singleton
 * 
 * This is the ONLY place that decised which database implementation to use.
 * If you want to use a different database, create another implementation of
 * IDatabase and then update this fucntion to instantiate the class.
 */
export async function createDatabase(): Promise<IDatabase> {
  if (database) {
    logger.debug('Returning existing database instance');
    return database;
  }

  if (config.server.isTest) {
    logger.info('Using in-memory database for test environment');

    database = new InMemoryDatabase();
  } else {
    logger.info('Connecting to Redis database');

    const redisDb = new RedisDatabase(
      config.redis.host,
      config.redis.port,
      config.redis.password
    );

    await redisDb.connect();
    
    database = redisDb;
  }

  return database;
}

/**
 * Gets the current database instance
 * 
 * @throws Error if createDatabase() hasn't been called
 */
export function getDatabase(): IDatabase {
  if (!database) {
    throw new Error(
      'Database not initialised. Call createDatabase() in server.ts before handling requests.'
    );
  }
  return database;
}

/**
 * Closes database connection
 */
export async function closeDatabase(): Promise<void> {
  if (!database) {
    return 
  }
  
  logger.info('Closing database connection');

  await database.close();
  database = null;

  logger.info('Database connection closed');
}

/**
 * Injects a database instance (for testing)
 */
export function setDatabase(db: IDatabase): void {
  database = db;
}

/**
 * Clears the database instance (for testing)
 */
export function clearDatabaseInstance(): void {
  database = null;
}