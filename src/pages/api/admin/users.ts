import type { APIRoute } from 'astro';
import { requireAdmin, isAuthContext } from '../../../lib/auth-middleware';
import { prisma } from '../../../lib/auth';

/** GET /api/admin/users – Paginated user list with search */
export const GET: APIRoute = async ({ request, cookies, url }) => {
    const auth = await requireAdmin(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const search = url.searchParams.get('q') ?? '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '25') || 25));
    const filter = url.searchParams.get('filter') ?? 'all'; // all | banned | admin | unverified

    const where: any = {};
    if (search) {
        where.OR = [
            { email: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { id: { equals: search } },
        ];
    }
    if (filter === 'banned') where.bannedAt = { not: null };
    if (filter === 'admin') where.role = 'ADMIN';
    if (filter === 'unverified') where.emailVerified = false;

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true, email: true, firstName: true, lastName: true,
                role: true, emailVerified: true, phoneVerified: true, idVerified: true,
                bannedAt: true, banReason: true, shadowBanned: true,
                city: true, createdAt: true,
                trustScore: { select: { score: true, level: true } },
                _count: { select: { listings: true, buyerDeals: true, sellerDeals: true, fraudSignals: true } },
            },
        }),
        prisma.user.count({ where }),
    ]);

    return new Response(JSON.stringify({
        users,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }), { headers: { 'Content-Type': 'application/json' } });
};

