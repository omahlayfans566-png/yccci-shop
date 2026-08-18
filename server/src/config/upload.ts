import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { env } from './env';

export const uploadRoot = path.resolve(process.cwd(), env.uploadDir);
export const receiptsDir = path.join(uploadRoot, 'receipts');
export const productsDir = path.join(uploadRoot, 'products');

fs.mkdirSync(receiptsDir, { recursive: true });
fs.mkdirSync(productsDir, { recursive: true });

/* ── Receipt upload (memory → B2 or disk) ── */
export const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxFileSizeMB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!env.allowedReceiptTypes.includes(file.mimetype)) {
      const err = Object.assign(
        new Error(`Invalid file type "${file.mimetype}". Allowed: ${env.allowedReceiptTypes.join(', ')}`),
        { status: 400 }
      );
      return cb(err as unknown as null, false);
    }
    cb(null, true);
  },
});

/* ── Product image upload (memory → B2) ── */
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

export const productImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxFileSizeMB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
      const err = Object.assign(
        new Error(`Invalid image type "${file.mimetype}". Allowed: jpeg, png, webp`),
        { status: 400 }
      );
      return cb(err as unknown as null, false);
    }
    cb(null, true);
  },
});

export function receiptPublicUrl(filename: string): string {
  return `/uploads/receipts/${filename}`;
}
