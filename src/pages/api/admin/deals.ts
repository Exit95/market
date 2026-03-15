import type { APIRoute } from 'astro';
import { requireAdmin, isAuthContext } from '../../../lib/auth-middleware';
import { prisma } from '../../../lib/auth';

/** GET /api/admin/deals – Paginated deal/order overview */
export const GET: APIRoute = async ({ request, cookies, url }) => {
    const auth = await requireAdmin(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '25')));
    const status = url.searchParams.get('status') ?? 'all';

    const where: any = {};
    if (status !== 'all') where.status = status.toUpperCase();

    const [deals, total] = await Promise.all([
        prisma.deal.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true, status: true, totalAmount: true, feeCents: true, currency: true,
                handshakeStatus: true, verificationMethod: true,
                createdAt: true, completedAt: true,
                buyer: { select: { id: true, email: true, firstName: true } },
                seller: { select: { id: true, email: true, firstName: true } },
                listing: { select: { id: true, title: true } },
                payment: { select: { status: true, provider: true } },
                dispute: { select: { id: true, status: true, reason: true } },
            },
        }),
        prisma.deal.count({ where }),
    ]);

    return new Response(JSON.stringify({
        deals,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }), { headers: { 'Content-Type': 'application/json' } });
};

