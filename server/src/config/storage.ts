import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env';

let _client: S3Client | null = null;

export function getS3Client(): S3Client {
    if (!_client) {
        _client = new S3Client({
            endpoint: `https://${env.b2Endpoint}`,
            region: 'us-east-005',
            credentials: {
                accessKeyId: env.b2KeyId,
                secretAccessKey: env.b2ApplicationKey,
            },
            forcePathStyle: true,
        });
    }
    return _client;
}

/** Reset the cached client — call after env changes in tests */
export function resetS3Client(): void {
    _client = null;
}

export function isB2Configured(): boolean {
    return !!(env.b2KeyId && env.b2ApplicationKey && env.b2BucketName && env.b2Endpoint);
}

/**
 * Upload a buffer to B2.
 * Returns the direct public HTTPS URL to the object.
 * Note: if your bucket is PRIVATE, use getSignedProductImageUrl() to serve images.
 */
export async function uploadToB2(opts: {
    key: string;
    buffer: Buffer;
    contentType: string;
    contentLength: number;
}): Promise<string> {
    const client = getS3Client();
    await client.send(
        new PutObjectCommand({
            Bucket: env.b2BucketName,
            Key: opts.key,
            Body: opts.buffer,
            ContentType: opts.contentType,
            ContentLength: opts.contentLength,
        })
    );
    // Return the stored key so the controller can persist it.
    // The full URL is reconstructed on demand (signed or public).
    return `https://${env.b2Endpoint}/${env.b2BucketName}/${opts.key}`;
}

/** Delete a file from B2 by its object key. */
export async function deleteFromB2(key: string): Promise<void> {
    if (!key) return;
    const client = getS3Client();
    await client.send(
        new DeleteObjectCommand({ Bucket: env.b2BucketName, Key: key })
    );
}

/**
 * Generate a signed URL for a B2 object (works for private buckets).
 * Product images: 24-hour expiry (long enough to not expire mid-browse).
 * Receipts: 1-hour expiry.
 */
export async function getSignedUrl24h(key: string): Promise<string> {
    const client = getS3Client();
    const command = new GetObjectCommand({ Bucket: env.b2BucketName, Key: key });
    return getSignedUrl(client, command, { expiresIn: 86400 }); // 24 hours
}

export async function getSignedReceiptUrl(key: string): Promise<string> {
    const client = getS3Client();
    const command = new GetObjectCommand({ Bucket: env.b2BucketName, Key: key });
    return getSignedUrl(client, command, { expiresIn: 3600 }); // 1 hour
}

/**
 * Extract the B2 object key from a stored full URL.
 * e.g. "https://s3.us-east-005.backblazeb2.com/yccci-shop/products/..." → "products/..."
 */
export function keyFromUrl(url: string): string {
    const prefix = `https://${env.b2Endpoint}/${env.b2BucketName}/`;
    if (url.startsWith(prefix)) return url.slice(prefix.length);
    return url;
}

/** Test B2 connectivity — uploads a tiny file then deletes it. */
export async function testB2Connection(): Promise<{ ok: boolean; error?: string }> {
    if (!isB2Configured()) return { ok: false, error: 'B2 not configured' };
    const testKey = `_health/connection-test-${Date.now()}.txt`;
    try {
        await uploadToB2({
            key: testKey,
            buffer: Buffer.from('shop-health-check'),
            contentType: 'text/plain',
            contentLength: 18,
        });
        await deleteFromB2(testKey);
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
}
