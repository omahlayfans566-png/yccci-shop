import dotenv from 'dotenv';
import path from 'node:path';

// Load .env from the server root (works whether running from server/ or dist/)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function intFromEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

function strFromEnv(key: string, fallback = ''): string {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

/** Validates required env vars at startup. Logs the missing key name (never the value). */
export function validateEnv(): void {
  const required = ['MONGODB_URI', 'JWT_SECRET'];
  const b2Required = ['B2_KEY_ID', 'B2_APPLICATION_KEY', 'B2_BUCKET_NAME', 'B2_ENDPOINT'];
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]?.trim()) missing.push(key);
  }
  // B2 — warn but don't hard-fail so local dev without B2 still works.
  for (const key of b2Required) {
    if (!process.env[key]?.trim()) {
      console.warn(`[shop] Missing recommended environment variable: ${key}`);
    }
  }
  if (missing.length > 0) {
    for (const key of missing) {
      console.error(`[shop] Missing required environment variable: ${key}`);
    }
    process.exit(1);
  }
}

export const env = {
  nodeEnv: strFromEnv('NODE_ENV', 'development'),
  port: intFromEnv('PORT', 5000),
  mongoUri: strFromEnv('MONGODB_URI', 'mongodb://127.0.0.1:27017/shop'),
  clientUrl: strFromEnv('CLIENT_URL', 'http://localhost:5173'),
  jwtSecret: strFromEnv('JWT_SECRET', 'development-only-insecure-secret-change-me'),
  jwtExpiresIn: strFromEnv('JWT_EXPIRES_IN', '7d'),
  uploadDir: strFromEnv('UPLOAD_DIR', 'uploads'),
  maxFileSizeMB: intFromEnv('MAX_FILE_SIZE_MB', 10),
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedReceiptTypes: (
    process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp,application/pdf'
  )
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean),
  // Backblaze B2
  b2KeyId: strFromEnv('B2_KEY_ID'),
  b2ApplicationKey: strFromEnv('B2_APPLICATION_KEY'),
  b2BucketName: strFromEnv('B2_BUCKET_NAME'),
  b2Endpoint: strFromEnv('B2_ENDPOINT'),
  adminInitial: {
    email: strFromEnv('ADMIN_INITIAL_EMAIL', 'admin@shop.com'),
    password: strFromEnv('ADMIN_INITIAL_PASSWORD', 'ChangeMe123!'),
    name: strFromEnv('ADMIN_INITIAL_NAME', 'Shop Admin'),
  },
} as const;