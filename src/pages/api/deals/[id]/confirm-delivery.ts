import type { APIRoute } from 'astro';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { prisma } from '../../../../lib/auth';

/**
 * POST /api/deals/:id/confirm-delivery  (buyer only)
 * SHIPPED → DELIVERED, starts 48h auto-release window.
 */
export const POST: APIRoute = async ({ request, cookies, params, clientAddress }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const deal = await prisma.deal.findUnique({ where: { id: params.id } });
    if (!deal) return err(404, 'Deal not found');
    if (deal.buyerId !== auth.userId) return err(403, 'Forbidden');
    if (deal.status !== 'SHIPPED') return err(409, `Expected SHIPPED, got ${deal.status}`);

    const updated = await prisma.deal.update({
        where: { id: params.id },
        data: { status: 'DELIVERED', completedAt: new Date() },
    });

    await prisma.auditLog.create({
        data: { actorId: auth.userId, action: 'deal_delivered', ip: clientAddress, metaJson: { dealId: params.id } },
    });

    return json({ deal: updated, note: 'Automatische Freigabe nach 48h ohne Dispute.' });
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
function err(status: number, error: string) {
    return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });
}

