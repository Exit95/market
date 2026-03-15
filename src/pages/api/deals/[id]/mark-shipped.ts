import type { APIRoute } from 'astro';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { prisma } from '../../../../lib/auth';

/**
 * POST /api/deals/:id/mark-shipped  (seller only)
 * Transitions deal from PAID → SHIPPED
 */
export const POST: APIRoute = async ({ request, cookies, params, clientAddress }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const deal = await prisma.deal.findUnique({ where: { id: params.id } });
    if (!deal) return err(404, 'Deal not found');
    if (deal.sellerId !== auth.userId && auth.user.role !== 'ADMIN') return err(403, 'Forbidden');
    if (deal.status !== 'PAID') return err(409, `Expected PAID, got ${deal.status}`);

    const { tracking, carrier } = (await request.json().catch(() => ({}))) as Record<string, string>;

    const updated = await prisma.deal.update({
        where: { id: params.id },
        data: { status: 'SHIPPED', trackingCode: tracking ?? null, carrier: carrier ?? null },
    });

    await prisma.auditLog.create({
        data: { actorId: auth.userId, action: 'deal_shipped', ip: clientAddress, metaJson: { dealId: params.id, tracking } },
    });

    return json({ deal: updated });
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
function err(status: number, error: string) {
    return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });
}

