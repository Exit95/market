import type { APIRoute } from 'astro';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { computeTrustScore } from '../../../../lib/trust-score';
import { prisma } from '../../../../lib/auth';

/**
 * GET /api/users/me/profile
 * Returns full profile with trust score breakdown.
 */
export const GET: APIRoute = async ({ request, cookies }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const [user, scoreData] = await Promise.all([
        prisma.user.findUnique({
            where: { id: auth.userId },
            select: {
                id: true, email: true, firstName: true, lastName: true,
                phone: true, avatarUrl: true, city: true, postalCode: true,
                role: true, emailVerified: true, phoneVerified: true, idVerified: true,
                createdAt: true, trustScore: true,
                _count: { select: { listings: true, buyerOrders: true, sellerOrders: true } },
            },
        }),
        computeTrustScore(auth.userId),
    ]);

    if (!user) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

    return new Response(JSON.stringify({ user, trustScore: scoreData }), {
        headers: { 'Content-Type': 'application/json' },
    });
};
