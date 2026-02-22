import type { APIRoute } from 'astro';
import { requireAdmin, isAuthContext } from '../../../lib/auth-middleware';
import { prisma } from '../../../lib/auth';

/** GET /api/admin/audit-log – last 50 admin actions */
export const GET: APIRoute = async ({ request, cookies }) => {
    const auth = await requireAdmin(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const logs = await prisma.auditLog.findMany({
        where: { action: { startsWith: 'admin_' } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, actorId: true, action: true, metaJson: true, createdAt: true },
    });

    return new Response(JSON.stringify(logs), { headers: { 'Content-Type': 'application/json' } });
};
