import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { Request } from 'express';
import apiRoutes from './routes';
import { notFound, errorHandler } from './middleware/error';
import { env } from './config/env';
import { uploadRoot } from './config/upload';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

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

  /**
   * Global JSON body parser.
   * The `verify` callback runs synchronously on every request and captures
   * the raw Buffer into req.rawBody.  This is what the Paystack webhook
   * handler uses for HMAC-SHA512 signature verification.
   *
   * All other routes are unaffected — req.body works exactly as before.
   */
  app.use(
    express.json({
      limit: '2mb',
      verify(req: Request & { rawBody?: Buffer }, _res, buf) {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Serve local uploads (fallback for dev when Cloudinary is not configured)
  app.use('/uploads', express.static(uploadRoot, { maxAge: '7d' }));

  app.use('/api', apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
