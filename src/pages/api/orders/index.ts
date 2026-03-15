import type { APIRoute } from 'astro';
import { requireAuth, isAuthContext } from '../../../lib/auth-middleware';
import { calcFee } from '../../../lib/stripe';
import { prisma } from '../../../lib/auth';

/**
 * POST /api/orders
 * Buyer creates an order for a listing.
 */
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    let body: unknown;
    try { body = await request.json(); } catch { return err(400, 'Invalid JSON'); }

    const { listingId } = body as { listingId?: string };
    if (!listingId) return err(400, 'listingId required');

    const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        select: { id: true, sellerId: true, status: true, price: true, title: true },
    });
    if (!listing) return err(404, 'Listing not found');
    if (listing.status !== 'ACTIVE') return err(409, 'Listing ist nicht verfügbar');
    if (listing.sellerId === auth.userId) return err(400, 'Eigenes Listing kann nicht gekauft werden');

    // Prevent duplicate orders
    const existing = await prisma.order.findFirst({
        where: { listingId, buyerId: auth.userId, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
    });
    if (existing) return json({ order: existing }, 200);

    const feeCents = calcFee(listing.price);
    const order = await prisma.order.create({
        data: {
            listingId,
            buyerId: auth.userId,
            sellerId: listing.sellerId,
            status: 'PENDING',
            totalAmount: listing.price,
            feeCents,
        },
    });

    // Reserve listing
    await prisma.listing.update({ where: { id: listingId }, data: { status: 'RESERVED' } });

    await prisma.auditLog.create({
        data: { actorId: auth.userId, action: 'order_create', ip: clientAddress, metaJson: { orderId: order.id, listingId } },
    });

    return json({ order }, 201);
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
function err(status: number, error: string) {
    return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });
}
