import express, { Application } from 'express';
import path from 'path';
import swaggerUi from 'swagger-ui-express';

import { uploadRoutes, statusRoutes } from './routes';
import { errorHandler, notFoundHandler } from './middleware';
import { swaggerSpec } from './swagger';
import { getDatabase } from './database';
import { logger } from './config';

/**
 * Creates and configures the Express application
 */
export function createApp(): Application {
  const app = express();

  // ==========================================================================
  // BUILT-IN MIDDLEWARE
  // ==========================================================================

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, '../public')));

  // ==========================================================================
  // REQUEST LOGGING
  // ==========================================================================

  // Log all incoming requests for debugging
  app.use((req, _res, next) => {
    logger.debug('Incoming request', {
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
    next();
  });

  // ==========================================================================
  // API DOCUMENTATION
  // ==========================================================================

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'File Upload API',
  }));
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // ==========================================================================
  // API ROUTES
  // ==========================================================================

  app.use('/upload', uploadRoutes);
  app.use('/status', statusRoutes);

  // ==========================================================================
  // HEALTH CHECK
  // ==========================================================================

  /**
   * GET /health
   */
  app.get('/health', async (_req, res) => {
    try {
      const db = getDatabase();
      const isHealthy = await db.isHealthy();

      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        database: isHealthy ? 'connected' : 'disconnected',
      });
    } catch {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'error',
      });
    }
  });

  // ==========================================================================
  // ROOT ENDPOINT
  // ==========================================================================

  /**
   * GET /
   */
  app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}