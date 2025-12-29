/**
 * Database Module Barrel Export
 */
export { IDatabase } from './IDatabase';
export {
  createDatabase,
  getDatabase,
  closeDatabase,
  setDatabase,
  clearDatabaseInstance,
} from './factory';
export { RedisDatabase } from './RedisDatabase';
export { InMemoryDatabase } from './InMemoryDatabase';