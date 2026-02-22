/**
 * src/lib/trust-score.ts
 * Trust Score calculation and level mapping.
 *
 * Score breakdown (max 100):
 *  +20  email verified
 *  +25  phone verified
 *  +30  id (KYC) verified
 *  +10  account age > 30 days
 *  + 5  account age > 180 days
 *  + 2  per completed order (max +10)
 *  +10  first listing sold
 *  -10  per open dispute against user (as seller)
 *  -15  per HIGH fraud signal
 *  -25  per CRITICAL fraud signal
 */
import { prisma } from './auth';
import type { TrustLevel } from '@prisma/client';

export interface ScoreBreakdown {
    score: number;
    level: TrustLevel;
    factors: Record<string, number>;
}

const LEVEL_MAP: Array<{ level: TrustLevel; min: number }> = [
    { level: 'ELITE', min: 85 },
    { level: 'TRUSTED', min: 65 },
    { level: 'VERIFIED', min: 40 },
    { level: 'BASIC', min: 15 },
    { level: 'NEW', min: 0 },
];

function toLevel(score: number): TrustLevel {
    return LEVEL_MAP.find(l => score >= l.min)!.level;
}

export async function computeTrustScore(userId: string): Promise<ScoreBreakdown> {
    const [user, orders, fraudSignals, disputes] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: { emailVerified: true, phoneVerified: true, idVerified: true, createdAt: true, bannedAt: true },
        }),
        prisma.order.findMany({
            where: { sellerId: userId, status: 'COMPLETED' },
            select: { id: true },
        }),
        prisma.fraudSignal.findMany({
            where: { userId, resolvedAt: null },
            select: { severity: true },
        }),
        prisma.dispute.findMany({
            where: { order: { sellerId: userId }, status: { notIn: ['CLOSED', 'RESOLVED_SELLER'] } },
            select: { id: true },
        }),
    ]);

    if (!user) return { score: 0, level: 'NEW', factors: {} };

    const factors: Record<string, number> = {};
    let score = 0;

    if (user.emailVerified) { factors.email_verified = 20; score += 20; }
    if (user.phoneVerified) { factors.phone_verified = 25; score += 25; }
    if (user.idVerified) { factors.id_verified = 30; score += 30; }

    const ageMs = Date.now() - user.createdAt.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays > 180) { factors.account_age_6m = 15; score += 15; }
    else if (ageDays > 30) { factors.account_age_30d = 10; score += 10; }

    const completedBonus = Math.min(orders.length * 2, 10);
    if (completedBonus > 0) { factors.completed_orders = completedBonus; score += completedBonus; }

    for (const sig of fraudSignals) {
        if (sig.severity === 'HIGH') { score -= 15; factors.fraud_high = (factors.fraud_high ?? 0) - 15; }
        if (sig.severity === 'CRITICAL') { score -= 25; factors.fraud_critical = (factors.fraud_critical ?? 0) - 25; }
    }

    const disputePenalty = disputes.length * 10;
    if (disputePenalty > 0) { factors.disputes = -disputePenalty; score -= disputePenalty; }

    // Banned = zero
    if (user.bannedAt) score = 0;

    score = Math.max(0, Math.min(100, score));
    return { score, level: toLevel(score), factors };
}

/** Recompute and persist TrustScore for a user */
export async function refreshTrustScore(userId: string) {
    const { score, level } = await computeTrustScore(userId);
    return prisma.trustScore.upsert({
        where: { userId },
        update: { score, level },
        create: { userId, score, level },
    });
}

/** Level-aware rate limits */
export function listingDayLimit(level: TrustLevel): number {
    return { NEW: 2, BASIC: 5, VERIFIED: 10, TRUSTED: 20, ELITE: 50 }[level] ?? 2;
}
export function presignDayLimit(level: TrustLevel): number {
    return { NEW: 10, BASIC: 20, VERIFIED: 40, TRUSTED: 80, ELITE: 200 }[level] ?? 10;
}
