/**
 * src/lib/s3.ts
 * AWS SDK v3 wrapper – works with MinIO and AWS S3
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function buildClient() {
    return new S3Client({
        endpoint: import.meta.env.S3_ENDPOINT,
        region: import.meta.env.S3_REGION || 'us-east-1',
        credentials: {
            accessKeyId: import.meta.env.S3_ACCESS_KEY,
            secretAccessKey: import.meta.env.S3_SECRET_KEY,
        },
        // MinIO requires path-style
        forcePathStyle: true,
    });
}

let _client: S3Client | null = null;
export function getS3Client() {
    if (!_client) _client = buildClient();
    return _client;
}

export const BUCKET_PUBLIC = () => import.meta.env.S3_BUCKET_PUBLIC || 'marketplace-public';
export const PUBLIC_BASE = () => import.meta.env.S3_PUBLIC_BASE_URL || '';

/** Generate a presigned PUT URL (browser uploads directly to MinIO) */
export async function presignPut(objectKey: string, contentType: string, expiresIn = 300) {
    const cmd = new PutObjectCommand({
        Bucket: BUCKET_PUBLIC(),
        Key: objectKey,
        ContentType: contentType,
    });
    return getSignedUrl(getS3Client(), cmd, { expiresIn });
}

/** Build the public URL for an object key */
export function publicUrl(objectKey: string) {
    return `${PUBLIC_BASE()}/${objectKey}`;
}

/** Delete an object from S3/MinIO */
export async function deleteObject(objectKey: string) {
    await getS3Client().send(new DeleteObjectCommand({
        Bucket: BUCKET_PUBLIC(),
        Key: objectKey,
    }));
}
