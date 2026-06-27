import type { APIRoute } from 'astro';
import { requireAuth, isAuthContext } from '../../../lib/auth-middleware';
import { calcBuyerFee, calcSellerCommission } from '../../../lib/stripe';
import { prisma } from '../../../lib/auth';

/**
 * GET /api/deals – List own deals (as buyer or seller)
 */
export const GET: APIRoute = async ({ request, cookies, url }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const status = url.searchParams.get('status');
    const role = url.searchParams.get('role'); // 'buyer' | 'seller' | null (both)

    const where: any = {
        OR: [{ buyerId: auth.userId }, { sellerId: auth.userId }],
    };
    if (role === 'buyer') { delete where.OR; where.buyerId = auth.userId; }
    if (role === 'seller') { delete where.OR; where.sellerId = auth.userId; }
    if (status) where.status = status.toUpperCase();

    const deals = await prisma.deal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
            listing: { select: { id: true, title: true, price: true, images: { take: 1, orderBy: { position: 'asc' }, select: { url: true } } } },
            buyer: { select: { id: true, firstName: true, lastName: true } },
            seller: { select: { id: true, firstName: true, lastName: true } },
            payment: { select: { status: true } },
        },
    });

    return json({ deals });
};

/**
 * POST /api/deals
 * Buyer creates a deal for a listing.
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

    // Prevent duplicate deals
    const existing = await prisma.deal.findFirst({
        where: { listingId, buyerId: auth.userId, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
    });
    if (existing) return json({ deal: existing }, 200);

    const buyerFeeCents = calcBuyerFee();                    // 0,50 € Servicegebühr
    const sellerCommissionCents = calcSellerCommission(listing.price); // 5 % Provision
    const deal = await prisma.deal.create({
        data: {
            listingId,
            buyerId: auth.userId,
            sellerId: listing.sellerId,
            status: 'PENDING',
            totalAmount: listing.price,
            feeCents: buyerFeeCents + sellerCommissionCents, // Gesamt-Plattformgebühr
        },
    });

    // Reserve listing
    await prisma.listing.update({ where: { id: listingId }, data: { status: 'RESERVED' } });

    await prisma.auditLog.create({
        data: { actorId: auth.userId, action: 'deal_create', ip: clientAddress, metaJson: { dealId: deal.id, listingId } },
    });

    return json({ deal }, 201);
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
function err(status: number, error: string) {
    return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });
}

