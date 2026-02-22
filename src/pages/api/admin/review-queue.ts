import type { APIRoute } from 'astro';
import { requireAdmin, isAuthContext } from '../../../lib/auth-middleware';
import { prisma } from '../../../lib/auth';

/**
 * GET /api/admin/review-queue
 * Returns users with unresolved fraud signals + their context.
 */
export const GET: APIRoute = async ({ request, cookies }) => {
    const auth = await requireAdmin(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const signals = await prisma.fraudSignal.findMany({
        where: { resolvedAt: null },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        take: 100,
        include: {
            user: {
                select: {
                    id: true, email: true, firstName: true, lastName: true,
                    bannedAt: true, shadowBanned: true,
                    emailVerified: true, phoneVerified: true, idVerified: true,
                    createdAt: true, trustScore: { select: { score: true, level: true } },
                    _count: { select: { listings: true, buyerOrders: true, fraudSignals: true } },
                },
            },
        },
    });

    // Group by userId for a compact view
    const byUser = new Map<string, { user: typeof signals[0]['user']; signals: typeof signals }>();
    for (const sig of signals) {
        if (!sig.user) continue;
        const entry = byUser.get(sig.userId!) ?? { user: sig.user, signals: [] };
        entry.signals.push(sig);
        byUser.set(sig.userId!, entry);
    }

    return new Response(JSON.stringify([...byUser.values()]), {
        headers: { 'Content-Type': 'application/json' },
    });
};
