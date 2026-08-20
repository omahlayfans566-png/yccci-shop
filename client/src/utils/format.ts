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
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

/**
 * Resolve a stored image URL for display in the browser.
 * Cloudinary URLs are full HTTPS — use them directly.
 * Local /uploads/ paths are proxied via the API server.
 */
export function resolveMediaUrl(url?: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;          // Cloudinary / B2 / any HTTPS
  if (url.startsWith('/uploads/')) {
    const base = apiBase();
    return base ? `${base}${url}` : url;              // local dev receipt proxy
  }
  return url;
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export function validateReceiptFile(file: File): string | null {
  if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
    return 'Unsupported file type. Please upload a JPG, PNG, WEBP image or a PDF file.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'File is too large. The maximum allowed size is 10 MB.';
  }
  return null;
}
