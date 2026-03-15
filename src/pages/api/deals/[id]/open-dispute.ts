import type { APIRoute } from 'astro';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { prisma } from '../../../../lib/auth';

const DISPUTABLE = new Set(['PAID', 'SHIPPED', 'DELIVERED']);

/**
 * POST /api/deals/:id/open-dispute  (buyer only)
 */
export const POST: APIRoute = async ({ request, cookies, params, clientAddress }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const deal = await prisma.deal.findUnique({ where: { id: params.id }, include: { dispute: true } });
    if (!deal) return err(404, 'Deal not found');
    if (deal.buyerId !== auth.userId) return err(403, 'Nur der Käufer kann einen Dispute eröffnen');
    if (!DISPUTABLE.has(deal.status)) return err(409, `Dispute nicht möglich bei Status: ${deal.status}`);
    if (deal.dispute) return err(409, 'Es besteht bereits ein offener Dispute');

    const { reason } = (await request.json().catch(() => ({}))) as { reason?: string };
    if (!reason?.trim()) return err(400, 'reason required');

    const [dispute] = await prisma.$transaction([
        prisma.dispute.create({
            data: { dealId: deal.id, openedById: auth.userId, reason: reason.trim(), status: 'OPEN' },
        }),
        prisma.deal.update({
            where: { id: params.id },
            data: { status: 'DISPUTED' },
        }),
    ]);

    await prisma.auditLog.create({
        data: { actorId: auth.userId, action: 'dispute_opened', ip: clientAddress, metaJson: { dealId: params.id, reason } },
    });

    return json({ dispute }, 201);
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
function err(status: number, error: string) {
    return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });
}

