import type { APIRoute } from 'astro';
import { requireAdmin, isAuthContext } from '../../../lib/auth-middleware';
import { prisma } from '../../../lib/auth';

/** GET /api/admin/stats – Dashboard statistics */
export const GET: APIRoute = async ({ request, cookies }) => {
    const auth = await requireAdmin(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
        totalUsers, newUsers30d, bannedUsers,
        totalListings, activeListings, newListings7d,
        totalDeals, completedDeals, disputedDeals, pendingDeals,
        totalFraudSignals, unresolvedSignals,
        recentAuditCount,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.user.count({ where: { bannedAt: { not: null } } }),
        prisma.listing.count(),
        prisma.listing.count({ where: { status: 'ACTIVE' } }),
        prisma.listing.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.deal.count(),
        prisma.deal.count({ where: { status: 'COMPLETED' } }),
        prisma.deal.count({ where: { status: 'DISPUTED' } }),
        prisma.deal.count({ where: { status: { in: ['PENDING', 'PAYMENT_PENDING', 'PAID'] } } }),
        prisma.fraudSignal.count(),
        prisma.fraudSignal.count({ where: { resolvedAt: null } }),
        prisma.auditLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    ]);

    // Revenue from completed deals
    const revenue = await prisma.deal.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { totalAmount: true, feeCents: true },
    });

    // Deals volume last 30 days
    const volume30d = await prisma.deal.aggregate({
        where: { createdAt: { gte: thirtyDaysAgo }, status: { in: ['COMPLETED', 'PAID', 'SHIPPED', 'DELIVERED'] } },
        _sum: { totalAmount: true },
        _count: true,
    });

    return new Response(JSON.stringify({
        users: { total: totalUsers, new30d: newUsers30d, banned: bannedUsers },
        listings: { total: totalListings, active: activeListings, new7d: newListings7d },
        deals: { total: totalDeals, completed: completedDeals, disputed: disputedDeals, pending: pendingDeals },
        fraud: { total: totalFraudSignals, unresolved: unresolvedSignals },
        revenue: {
            totalCents: revenue._sum.totalAmount ?? 0,
            feeCents: revenue._sum.feeCents ?? 0,
        },
        volume30d: {
            totalCents: volume30d._sum.totalAmount ?? 0,
            count: volume30d._count ?? 0,
        },
        auditEvents7d: recentAuditCount,
    }), { headers: { 'Content-Type': 'application/json' } });
};

