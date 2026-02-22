import type { APIRoute } from 'astro';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { prisma } from '../../../../lib/auth';

/**
 * POST /api/orders/:id/mark-shipped  (seller only)
 * Transitions order from PAID → SHIPPED
 */
export const POST: APIRoute = async ({ request, cookies, params, clientAddress }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const order = await prisma.order.findUnique({ where: { id: params.id } });
    if (!order) return err(404, 'Order not found');
    if (order.sellerId !== auth.userId && auth.user.role !== 'ADMIN') return err(403, 'Forbidden');
    if (order.status !== 'PAID') return err(409, `Expected PAID, got ${order.status}`);

    const { tracking, carrier } = (await request.json().catch(() => ({}))) as Record<string, string>;

    const updated = await prisma.order.update({
        where: { id: params.id },
        data: { status: 'SHIPPED', trackingCode: tracking ?? null, carrier: carrier ?? null },
    });

    await prisma.auditLog.create({
        data: { actorId: auth.userId, action: 'order_shipped', ip: clientAddress, metaJson: { orderId: params.id, tracking } },
    });

    return json({ order: updated });
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
function err(status: number, error: string) {
    return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });
}
