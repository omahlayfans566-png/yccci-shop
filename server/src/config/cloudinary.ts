import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

let _configured = false;

export function configureCloudinary(): void {
    if (_configured) return;
    cloudinary.config({
        cloud_name: env.cloudinaryCloudName,
        api_key: env.cloudinaryApiKey,
        api_secret: env.cloudinaryApiSecret,
        secure: true,
    });
    _configured = true;
}

export function isCloudinaryConfigured(): boolean {
    return !!(env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret);
}

export interface CloudinaryResult {
    publicId: string;
    secureUrl: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
}

/** Upload any buffer to Cloudinary. Returns public_id + secure_url. */
export async function uploadToCloudinary(
    buffer: Buffer,
    opts: {
        folder: string;
        resourceType?: 'image' | 'raw' | 'auto';
        /** 'authenticated' makes the asset private (for receipts) */
        type?: 'upload' | 'authenticated';
        transformation?: object[];
    }
): Promise<CloudinaryResult> {
    configureCloudinary();
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: opts.folder,
                resource_type: opts.resourceType ?? 'image',
                type: opts.type ?? 'upload',
                allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
                transformation: opts.transformation,
            },
            (err, result) => {
                if (err || !result) { reject(err ?? new Error('No result from Cloudinary')); return; }
                resolve({
                    publicId: result.public_id,
                    secureUrl: result.secure_url,
                    width: result.width ?? 0,
                    height: result.height ?? 0,
                    format: result.format ?? '',
                    bytes: result.bytes ?? 0,
                });
            }
        );
        stream.end(buffer);
    });
}

/** Upload a product image (public delivery). */
export async function uploadProductImage(
    buffer: Buffer,
    productId: string
): Promise<CloudinaryResult> {
    return uploadToCloudinary(buffer, {
        folder: `shop/products/${productId}`,
        resourceType: 'image',
        type: 'upload',           // public URL — fine for product images
        transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
        ],
    });
}

/** Upload a payment receipt (authenticated/private delivery). */
export async function uploadReceiptToCloudinary(
    buffer: Buffer,
    orderId: string,
    mimeType: string
): Promise<CloudinaryResult> {
    const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(mimeType);
    return uploadToCloudinary(buffer, {
        folder: `shop/receipts/${orderId}`,
        resourceType: isImage ? 'image' : 'raw',
        type: 'authenticated',    // private — only accessible via signed URL
    });
}

/** Delete any asset from Cloudinary by public_id. Silently ignores missing assets. */
export async function deleteFromCloudinary(
    publicId: string,
    resourceType: 'image' | 'raw' = 'image',
    deliveryType: 'upload' | 'authenticated' = 'upload'
): Promise<void> {
    if (!publicId) return;
    configureCloudinary();
    try {
        await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
            type: deliveryType,
        });
    } catch {
        // Non-fatal
    }
}

/**
 * Generate a short-lived signed URL for a private (authenticated) Cloudinary asset.
 * Used exclusively for admin access to payment receipts.
 * Expiry: 1 hour.
 */
export function getPrivateCloudinaryUrl(publicId: string, resourceType: 'image' | 'raw' = 'image'): string {
    configureCloudinary();
    // Cloudinary SDK generates a signed URL for authenticated delivery
    return cloudinary.url(publicId, {
        resource_type: resourceType,
        type: 'authenticated',
        secure: true,
        sign_url: true,
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    });
}

/** Test Cloudinary: upload a 1×1 pixel then delete it. No products created. */
export async function testCloudinaryConnection(): Promise<{ ok: boolean; error?: string }> {
    if (!isCloudinaryConfigured()) return { ok: false, error: 'Cloudinary not configured' };

    // Minimal valid 1×1 white JPEG (~600 bytes)
    const pixelB64 =
        '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB' +
        'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/E' +
        'ABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMR' +
        'AD8AJQAB/9k=';
    const buffer = Buffer.from(pixelB64, 'base64');

    let publicId = '';
    try {
        const r = await uploadToCloudinary(buffer, { folder: 'shop/_test', resourceType: 'image', type: 'upload' });
        publicId = r.publicId;
        await deleteFromCloudinary(publicId, 'image', 'upload');
        return { ok: true };
    } catch (err) {
        if (publicId) await deleteFromCloudinary(publicId, 'image', 'upload').catch(() => { });
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
}
