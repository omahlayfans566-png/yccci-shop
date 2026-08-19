import { apiBase, apiUrl } from '../api/client';

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

/**
 * Resolves a stored image URL for display.
 *
 * B2 images are stored as full https://... URLs.
 * If the bucket is public  → use the URL directly.
 * If the bucket is private → the browser will get a 403.
 *
 * We always try the direct URL first. The <img> onError handler in components
 * should call resolveImageViaApi() to fetch a fresh signed URL as fallback.
 */
export function resolveMediaUrl(url?: string): string {
  if (!url) return '';
  // Already a full HTTPS URL (B2 direct or signed)
  if (/^https?:\/\//i.test(url)) return url;
  // Local /uploads/ path
  if (url.startsWith('/uploads/')) {
    const base = apiBase();
    return base ? `${base}${url}` : url;
  }
  return url;
}

/**
 * Returns the API endpoint to fetch a fresh signed product image URL.
 * Use this as an onError fallback when the direct B2 URL returns 403.
 *
 * Usage in JSX:
 *   <img src={resolveMediaUrl(product.mainImage)}
 *        onError={(e) => fetchSignedImageUrl(product._id, 0).then(u => e.currentTarget.src = u)} />
 */
export async function fetchSignedImageUrl(productId: string, index = 0): Promise<string> {
  try {
    const res = await fetch(apiUrl(`/api/products/${productId}/image-url?index=${index}`));
    if (!res.ok) return '';
    const data = await res.json() as { success: boolean; url: string };
    return data.url || '';
  } catch {
    return '';
  }
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
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
