import type { APIRoute } from 'astro';
import { requireAdmin, isAuthContext } from '../../../lib/auth-middleware';
import { prisma } from '../../../lib/auth';

/** GET /api/admin/listings – Paginated listing overview */
export const GET: APIRoute = async ({ request, cookies, url }) => {
    const auth = await requireAdmin(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const search = url.searchParams.get('q') ?? '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '25') || 25));
    const status = url.searchParams.get('status') ?? 'all';

    const where: any = {};
    if (search) {
        where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { id: { equals: search } },
        ];
    }
    if (status !== 'all') where.status = status.toUpperCase();

    const [listings, total] = await Promise.all([
        prisma.listing.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true, title: true, price: true, currency: true,
                category: true, status: true, city: true,
                viewCount: true, treuhand: true,
                createdAt: true, soldAt: true,
                seller: { select: { id: true, email: true, firstName: true, lastName: true } },
                images: { select: { url: true }, take: 1 },
                _count: { select: { deals: true } },
            },
        }),
        prisma.listing.count({ where }),
    ]);

    return new Response(JSON.stringify({
        listings,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }), { headers: { 'Content-Type': 'application/json' } });
};

/** DELETE /api/admin/listings – Remove a listing */
export const DELETE: APIRoute = async ({ request, cookies }) => {
    const auth = await requireAdmin(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const { listingId, reason } = await request.json().catch(() => ({ listingId: '', reason: '' }));
    if (!listingId) return new Response(JSON.stringify({ error: 'listingId required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    await prisma.listing.update({ where: { id: listingId }, data: { status: 'REMOVED' } });

    await prisma.adminAction.create({
        data: {
            adminId: auth.userId,
            actionType: 'remove_listing',
            metaJson: { listingId, reason },
        },
    });

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};

