/**
 * src/lib/fraud-detection.ts
 * MVP Fraud Detection – runs after key events and creates FraudSignal entries.
 *
 * Rules:
 *  1. TOO_MANY_LISTINGS   – > 5 listings in 1h
 *  2. CHAT_WITHOUT_ORDERS – > 10 conversations, 0 orders (buyer)
 *  3. LOW_PRICE_LISTING   – price < 30% of category median
 *  4. MANY_FAILED_LOGINS  – > 10 failed logins in 1h (IP or userId)
 *  5. FREQUENT_MSG_BLOCKS – > 5 blocked messages in 1h
 */
import { prisma } from './auth';
import type { FraudSeverity } from '@prisma/client';

/** Category price medians in cents (rough market estimate) */
const CATEGORY_MEDIANS: Record<string, number> = {
    ELEKTRONIK: 15000,   // 150€
    FAHRZEUGE: 500000,  // 5000€
    MODE: 2500,    // 25€
    MOEBEL: 10000,   // 100€
    SPORT: 8000,    // 80€
    HAUSHALT: 5000,    // 50€
    BUCHER: 1000,    // 10€
    SPIELZEUG: 2000,    // 20€
    SONSTIGES: 5000,
};

async function createSignal(userId: string, type: string, severity: FraudSeverity, meta: object) {
    // Deduplicate: skip if unresolved signal of same type exists
    const existing = await prisma.fraudSignal.findFirst({
        where: { userId, type, resolvedAt: null },
    });
    if (existing) return;
    await prisma.fraudSignal.create({
        data: { userId, type, severity, metaJson: meta },
    });
}

export async function checkListingFraud(userId: string, listing: { price: number; category: string }) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Rule 1: Too many listings in 1h
    const recentCount = await prisma.listing.count({
        where: { sellerId: userId, createdAt: { gte: oneHourAgo } },
    });
    if (recentCount > 5) {
        await createSignal(userId, 'TOO_MANY_LISTINGS', 'MEDIUM', { recentCount, window: '1h' });
    }

    // Rule 3: Low price vs category median
    const median = CATEGORY_MEDIANS[listing.category] ?? 5000;
    if (listing.price > 0 && listing.price < median * 0.3) {
        await createSignal(userId, 'SUSPICIOUSLY_LOW_PRICE', 'HIGH', {
            price: listing.price,
            category: listing.category,
            median,
            ratio: (listing.price / median).toFixed(2),
        });
    }
}

export async function checkChatWithoutOrderFraud(userId: string) {
    const [convCount, orderCount] = await Promise.all([
        prisma.conversation.count({ where: { buyerId: userId } }),
        prisma.order.count({ where: { buyerId: userId } }),
    ]);
    if (convCount > 10 && orderCount === 0) {
        await createSignal(userId, 'CHAT_WITHOUT_ORDERS', 'MEDIUM', { convCount, orderCount });
    }
}

export async function checkFailedLoginFraud(userId: string | undefined, ip: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const ipCount = await prisma.auditLog.count({
        where: { action: 'failed_login', ip, createdAt: { gte: oneHourAgo } },
    });
    if (ipCount > 10) {
        // IP-based – no userId association, just log
        await prisma.fraudSignal.create({
            data: { userId: userId ?? undefined, type: 'MANY_FAILED_LOGINS_IP', severity: 'HIGH', metaJson: { ip, count: ipCount } },
        }).catch(() => { }); // allow duplicates for IP signals
    }

    if (userId) {
        const userCount = await prisma.auditLog.count({
            where: { actorId: userId, action: 'failed_login', createdAt: { gte: oneHourAgo } },
        });
        if (userCount > 5) {
            await createSignal(userId, 'MANY_FAILED_LOGINS', 'HIGH', { count: userCount, window: '1h' });
        }
    }
}

export async function checkMessageBlockFraud(userId: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const blockCount = await prisma.auditLog.count({
        where: { actorId: userId, action: 'message_blocked', createdAt: { gte: oneHourAgo } },
    });
    if (blockCount > 5) {
        await createSignal(userId, 'FREQUENT_MSG_BLOCKS', 'MEDIUM', { blockCount, window: '1h' });
    }
}
