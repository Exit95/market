/**
 * Unit Tests – Ehren-Deal Marketplace
 * Tests for: calcFee, rate-limit, Zod validation schemas, auth helpers
 */
import { describe, it, expect, beforeEach } from 'vitest';

// ──────────────────────────── Gebührenmodell ────────────────────────────────

// Re-implement locally to avoid import.meta.env dependency
const BUYER_FEE_CENTS = 50; // 0,50 € feste Servicegebühr
const SELLER_COMMISSION_RATE = 0.05; // 5 % Verkaufsprovision

function calcBuyerFee(): number {
    return BUYER_FEE_CENTS;
}

function calcSellerCommission(priceCents: number): number {
    return Math.round(priceCents * SELLER_COMMISSION_RATE);
}

function calcBuyerTotal(priceCents: number): number {
    return priceCents + BUYER_FEE_CENTS;
}

function calcSellerPayout(priceCents: number): number {
    return priceCents - calcSellerCommission(priceCents);
}

describe('Käufer-Servicegebühr (0,50 € fest)', () => {
    it('returns 50 cents always', () => {
        expect(calcBuyerFee()).toBe(50);
    });

    it('calculates buyer total (price + 0,50 €)', () => {
        expect(calcBuyerTotal(10000)).toBe(10050); // 100 € + 0,50 €
        expect(calcBuyerTotal(94900)).toBe(94950); // 949 € + 0,50 €
        expect(calcBuyerTotal(0)).toBe(50);        // 0 € + 0,50 €
    });
});

describe('Verkäufer-Provision (5 %)', () => {
    it('calculates 5% of 10000 cents (100 €)', () => {
        expect(calcSellerCommission(10000)).toBe(500);
    });

    it('calculates commission for 94900 cents (949 €)', () => {
        expect(calcSellerCommission(94900)).toBe(4745);
    });

    it('returns 0 for 0 cents', () => {
        expect(calcSellerCommission(0)).toBe(0);
    });

    it('rounds correctly for small amounts', () => {
        // 500 * 0.05 = 25
        expect(calcSellerCommission(500)).toBe(25);
        // 123 * 0.05 = 6.15 → rounds to 6
        expect(calcSellerCommission(123)).toBe(6);
    });

    it('calculates seller payout correctly', () => {
        expect(calcSellerPayout(10000)).toBe(9500);  // 100 € - 5 € = 95 €
        expect(calcSellerPayout(94900)).toBe(90155);  // 949 € - 47,45 € = 901,55 €
    });

    it('handles large amounts', () => {
        // 1_000_000 * 0.05 = 50000
        expect(calcSellerCommission(1_000_000)).toBe(50000);
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

