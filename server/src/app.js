import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import config from './config.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler, ApiError } from './middleware/error.js';

/**
 * Builds the Express app. Kept separate from the listener in index.js so tests
 * can mount the app with supertest without binding a port.
 */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin/server-to-server requests have no Origin header.
        if (!origin || config.clientOrigins.includes(origin)) return callback(null, true);
        return callback(ApiError.unauthorized(`Origin ${origin} is not allowed.`));
      },
      credentials: true,
    }),
  );
  // Request logging is noise in tests, and the logs are not what is under test.
  if (config.env !== 'test') {
    app.use(morgan(config.isProd ? 'combined' : 'dev'));
  }
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
