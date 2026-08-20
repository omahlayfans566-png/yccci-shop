import dotenv from 'dotenv';
import path from 'node:path';

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

export function validateEnv(): void {
  const required = ['MONGODB_URI', 'JWT_SECRET'];
  const recommended = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]?.trim()) missing.push(key);
  }
  for (const key of recommended) {
    if (!process.env[key]?.trim()) {
      console.warn(`[shop] Missing recommended env var: ${key}`);
    }
  }
  if (missing.length > 0) {
    for (const key of missing) console.error(`[shop] Missing required env var: ${key}`);
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
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'] as string[],
  allowedReceiptTypes: (
    process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp,application/pdf'
  ).split(',').map((t) => t.trim()).filter(Boolean),
  // Cloudinary — ALL media storage (product images + payment receipts)
  cloudinaryCloudName: strFromEnv('CLOUDINARY_CLOUD_NAME'),
  cloudinaryApiKey: strFromEnv('CLOUDINARY_API_KEY'),
  cloudinaryApiSecret: strFromEnv('CLOUDINARY_API_SECRET'),
  adminInitial: {
    email: strFromEnv('ADMIN_INITIAL_EMAIL', 'admin@shop.com'),
    password: strFromEnv('ADMIN_INITIAL_PASSWORD', 'ChangeMe123!'),
    name: strFromEnv('ADMIN_INITIAL_NAME', 'Shop Admin'),
  },
} as const;
