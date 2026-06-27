/**
 * src/lib/env.ts
 * Runtime environment variables — uses process.env for server-side values.
 * import.meta.env wird beim Build inlined und funktioniert nicht für Runtime-Secrets in Docker.
 */

function get(key: string, fallback = ''): string {
    // process.env ist zur Laufzeit verfügbar (Node.js)
    return process.env[key] || import.meta.env[key] || fallback;
}

// App
export const APP_URL = () => get('APP_URL', 'http://localhost:4321');

// SMTP
export const SMTP_HOST = () => get('SMTP_HOST', 'localhost');
export const SMTP_PORT = () => Number(get('SMTP_PORT', '587'));
export const SMTP_SECURE = () => get('SMTP_SECURE') === 'true';
export const SMTP_USER = () => get('SMTP_USER');
export const SMTP_PASS = () => get('SMTP_PASS');
export const SMTP_FROM = () => get('SMTP_FROM', 'Ehren-Deal <office@ehren-deal.de>');

// Stripe
export const STRIPE_SECRET_KEY = () => get('STRIPE_SECRET_KEY');
export const STRIPE_WEBHOOK_SECRET = () => get('STRIPE_WEBHOOK_SECRET');
export const STRIPE_PUBLISHABLE_KEY = () => get('STRIPE_PUBLISHABLE_KEY');

// S3
export const S3_ENDPOINT = () => get('S3_ENDPOINT');
export const S3_REGION = () => get('S3_REGION', 'eu-central-1');
export const S3_BUCKET = () => get('S3_BUCKET', 'ehren-deal');
export const S3_ACCESS_KEY = () => get('S3_ACCESS_KEY');
export const S3_SECRET_KEY = () => get('S3_SECRET_KEY');
export const S3_BUCKET_PUBLIC = () => get('S3_BUCKET_PUBLIC', 'ehren-deal');
export const S3_PUBLIC_BASE_URL = () => get('S3_PUBLIC_BASE_URL');

// Ably
export const ABLY_API_KEY = () => get('ABLY_API_KEY');

// IDnow
export const IDNOW_API_KEY = () => get('IDNOW_API_KEY');
export const IDNOW_COMPANY_ID = () => get('IDNOW_COMPANY_ID');
export const IDNOW_BASE_URL = () => get('IDNOW_BASE_URL', 'https://gateway.test.idnow.de');
export const IDNOW_WEBHOOK_SECRET = () => get('IDNOW_WEBHOOK_SECRET');
