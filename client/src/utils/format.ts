import { apiBase } from '../api/client';

/** Formats a number as Naira. */
export function formatMoney(amount: number): string {
  try {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  } catch {
    return `₦${amount.toFixed(2)}`;
  }
}

export function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

/** Builds an absolute URL for media returned by the API. */
export function resolveMediaUrl(url?: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/uploads/')) {
    const base = apiBase();
    return base ? `${base}${url}` : url; // dev: Vite proxies /uploads to the API
  }
  return url;
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB — mirrors MAX_FILE_SIZE_MB on the server
export const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export function validateReceiptFile(file: File): string | null {
  if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
    return 'Unsupported file type. Please upload a JPG, PNG, WEBP image or a PDF file.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'File is too large. The maximum allowed size is 5 MB.';
  }
  return null;
}