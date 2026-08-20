import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { env } from './env';

// Local fallback directory (used only when Cloudinary is not configured)
export const uploadRoot = path.resolve(process.cwd(), env.uploadDir);
export const receiptsDir = path.join(uploadRoot, 'receipts');
fs.mkdirSync(receiptsDir, { recursive: true });

const ALLOWED_RECEIPT_MIMES = env.allowedReceiptTypes;
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

/* Receipt upload — memory storage → Cloudinary (or local fallback) */
export const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxFileSizeMB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_RECEIPT_MIMES.includes(file.mimetype)) {
      return cb(Object.assign(
        new Error(`Invalid file type. Allowed: ${ALLOWED_RECEIPT_MIMES.join(', ')}`),
        { status: 400 }
      ) as unknown as null, false);
    }
    cb(null, true);
  },
});

/* Product image upload — memory storage → Cloudinary */
export const productImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxFileSizeMB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
      return cb(Object.assign(
        new Error(`Invalid image type. Allowed: jpeg, png, webp`),
        { status: 400 }
      ) as unknown as null, false);
    }
    cb(null, true);
  },
});
