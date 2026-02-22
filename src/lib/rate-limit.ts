/**
 * src/lib/rate-limit.ts
 * Simple in-memory rate limiter (per userId or IP)
 */

interface Bucket {
    count: number;
    resetAt: number;
}

const store = new Map<string, Bucket>();

/** Returns true if the action is allowed, false if rate-limited */
export function checkRateLimit(key: string, maxCount: number, windowMs: number): boolean {
    const now = Date.now();
    const bucket = store.get(key);

    if (!bucket || now > bucket.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }

    if (bucket.count >= maxCount) return false;
    bucket.count++;
    return true;
}

export function rateLimitResponse(retryAfterSec = 3600) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
        status: 429,
        headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfterSec),
        },
    });
}
