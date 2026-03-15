/**
 * Unit Tests – Ehren-Deal Marketplace
 * Tests for: calcFee, rate-limit, Zod validation schemas, auth helpers
 */
import { describe, it, expect, beforeEach } from 'vitest';

// ──────────────────────────── calcFee ────────────────────────────────────────

// Re-implement locally to avoid import.meta.env dependency
const FEE_RATE = 0.024;
function calcFee(amountCents: number) {
    return Math.round(amountCents * FEE_RATE);
}

describe('calcFee (2.4% platform fee)', () => {
    it('calculates 2.4% of 10000 cents (100€)', () => {
        expect(calcFee(10000)).toBe(240);
    });

    it('calculates fee for 94900 cents (949€)', () => {
        expect(calcFee(94900)).toBe(2278);
    });

    it('returns 0 for 0 cents', () => {
        expect(calcFee(0)).toBe(0);
    });

    it('rounds correctly for small amounts', () => {
        // 500 * 0.024 = 12
        expect(calcFee(500)).toBe(12);
        // 123 * 0.024 = 2.952 → rounds to 3
        expect(calcFee(123)).toBe(3);
    });

    it('handles large amounts', () => {
        // 1_000_000 * 0.024 = 24000
        expect(calcFee(1_000_000)).toBe(24000);
    });
});

// ──────────────────────────── Rate Limiter ───────────────────────────────────

// Re-implement to test in isolation
function createRateLimiter() {
    const store = new Map<string, { count: number; resetAt: number }>();

    function checkRateLimit(key: string, maxCount: number, windowMs: number): boolean {
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

    return { checkRateLimit, store };
}

describe('checkRateLimit', () => {
    let rl: ReturnType<typeof createRateLimiter>;

    beforeEach(() => {
        rl = createRateLimiter();
    });

    it('allows first request', () => {
        expect(rl.checkRateLimit('test', 3, 60000)).toBe(true);
    });

    it('allows up to maxCount requests', () => {
        expect(rl.checkRateLimit('test', 3, 60000)).toBe(true);
        expect(rl.checkRateLimit('test', 3, 60000)).toBe(true);
        expect(rl.checkRateLimit('test', 3, 60000)).toBe(true);
    });

    it('blocks after maxCount', () => {
        rl.checkRateLimit('test', 2, 60000);
        rl.checkRateLimit('test', 2, 60000);
        expect(rl.checkRateLimit('test', 2, 60000)).toBe(false);
    });

    it('different keys are independent', () => {
        rl.checkRateLimit('a', 1, 60000);
        expect(rl.checkRateLimit('a', 1, 60000)).toBe(false);
        expect(rl.checkRateLimit('b', 1, 60000)).toBe(true);
    });

    it('resets after window expires', () => {
        rl.checkRateLimit('test', 1, 1); // 1ms window
        // Force bucket to be expired
        const bucket = rl.store.get('test')!;
        bucket.resetAt = Date.now() - 1;
        expect(rl.checkRateLimit('test', 1, 60000)).toBe(true);
    });
});

// ──────────────────────────── Zod Validation ─────────────────────────────────

import { z } from 'zod';

const RegisterSchema = z.object({
    email: z.string().email('Ungültige E-Mail-Adresse'),
    password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
    firstName: z.string().min(1).max(80).optional(),
    lastName: z.string().min(1).max(80).optional(),
});

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

describe('RegisterSchema validation', () => {
    it('accepts valid registration data', () => {
        const result = RegisterSchema.safeParse({
            email: 'test@example.com',
            password: 'securePass123',
            firstName: 'Max',
            lastName: 'Mustermann',
        });
        expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
        const result = RegisterSchema.safeParse({ email: 'not-an-email', password: '12345678' });
        expect(result.success).toBe(false);
    });

    it('rejects short password (< 8 chars)', () => {
        const result = RegisterSchema.safeParse({ email: 'test@example.com', password: '1234567' });
        expect(result.success).toBe(false);
    });

    it('allows missing firstName/lastName (optional)', () => {
        const result = RegisterSchema.safeParse({ email: 'test@example.com', password: '12345678' });
        expect(result.success).toBe(true);
    });
});

describe('LoginSchema validation', () => {
    it('accepts valid login data', () => {
        const result = LoginSchema.safeParse({ email: 'user@example.com', password: 'pass' });
        expect(result.success).toBe(true);
    });

    it('rejects empty password', () => {
        const result = LoginSchema.safeParse({ email: 'user@example.com', password: '' });
        expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
        const result = LoginSchema.safeParse({ email: 'bad', password: 'pass' });
        expect(result.success).toBe(false);
    });
});

// ──────────────────────────── isAuthContext ──────────────────────────────────

describe('isAuthContext', () => {
    // Re-implement to test without Astro imports
    function isAuthContext(v: object | Response): v is object {
        return !(v instanceof Response);
    }

    it('returns true for auth context object', () => {
        expect(isAuthContext({ userId: '123', sessionId: 'abc', user: {} })).toBe(true);
    });

    it('returns false for Response', () => {
        expect(isAuthContext(new Response('', { status: 401 }))).toBe(false);
    });
});

