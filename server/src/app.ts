import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import apiRoutes from './routes';
import { notFound, errorHandler } from './middleware/error';
import { env } from './config/env';
import { uploadRoot } from './config/upload';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  // Security headers — allow cross-origin for B2 media
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // CORS — only the shop frontend is allowed
  const allowedOrigins = env.clientUrl.split(',').map((o) => o.trim()).filter(Boolean);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: false,
    })
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Serve locally-stored receipts (fallback when B2 is not configured)
  app.use('/uploads', express.static(uploadRoot, { maxAge: '7d' }));

  app.use('/api', apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
