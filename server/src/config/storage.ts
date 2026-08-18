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

export function isB2Configured(): boolean {
    return !!(env.b2KeyId && env.b2ApplicationKey && env.b2BucketName && env.b2Endpoint);
}

/** Upload a buffer to B2. Returns the public URL. */
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

/** Generate a short-lived signed URL for private receipt access (1 hour). */
export async function getSignedReceiptUrl(key: string): Promise<string> {
    const client = getS3Client();
    const command = new GetObjectCommand({ Bucket: env.b2BucketName, Key: key });
    return getSignedUrl(client, command, { expiresIn: 3600 });
}

/** Test B2 connectivity by attempting a tiny upload then delete. */
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
