/**
 * Server Entry Point
 *
 * Entry point for the application.
 * Handles startup, shutdown, and process signals.
 * 
 * Seperate to app for testability
 */

import { createApp } from './app';
import { createDatabase, closeDatabase } from './database';
import { config, logger } from './config';

/**
 * Starts the server
 */
async function startServer(): Promise<void> {
  try {
    // ==========================================================================
    // STEP 1: Connect to database
    // ==========================================================================
    logger.info('Connecting to database...');
    await createDatabase();
    logger.info('Database connected');

    // ==========================================================================
    // STEP 2: Create Express app
    // ==========================================================================
    const app = createApp();

    // ==========================================================================
    // STEP 3: Start HTTP server
    // ==========================================================================
    const server = app.listen(config.server.port, () => {
      logger.info('Server started', {
        port: config.server.port,
        environment: config.server.nodeEnv,
        apiDocs: `http://localhost:${config.server.port}/api-docs`,
        healthCheck: `http://localhost:${config.server.port}/health`,
      });
    });

    // ==========================================================================
    // STEP 4: Graceful shutdown handling
    // ==========================================================================
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await closeDatabase();
          
          logger.info('Database closed. Exiting.');

          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error });
          
          process.exit(1);
        }
      });

      // Force exit if graceful shutdown takes too long
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Kubernetes/Docker send this for graceful shutdown
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    // Ctrl+C sends this
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
      });
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled Rejection', { reason });
      shutdown('unhandledRejection');
    });

  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

startServer();