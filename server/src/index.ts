import { createApp } from './app';
import { env, validateEnv } from './config/env';
import { connectDB } from './config/db';
import { ensurePaymentSettings } from './models/PaymentSettings';
import { ensureInitialAdmin } from './seed/seed';

async function bootstrap() {
  validateEnv();
  await connectDB();
  await ensurePaymentSettings();
  await ensureInitialAdmin();

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`[shop] API running → http://localhost:${env.port}`);
    console.log(`[shop] frontend origin → ${env.clientUrl}`);
    console.log(`[shop] environment → ${env.nodeEnv}`);
  });
}

bootstrap().catch((err) => {
  console.error('[shop] failed to start:', err);
  process.exit(1);
});
