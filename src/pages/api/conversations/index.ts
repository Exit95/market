import type { APIRoute } from 'astro';
import { requireAuth, isAuthContext } from '../../../lib/auth-middleware';
import { prisma } from '../../../lib/auth';

// ── GET /api/conversations – List own conversations ───────────────────────────
export const GET: APIRoute = async ({ request, cookies }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const convs = await prisma.conversation.findMany({
        where: {
            OR: [{ buyerId: auth.userId }, { sellerId: auth.userId }],
        },
        orderBy: { updatedAt: 'desc' },
        include: {
            listing: { select: { id: true, title: true, price: true, status: true, images: { take: 1, select: { url: true } } } },
            buyer: { select: { id: true, firstName: true, lastName: true } },
            seller: { select: { id: true, firstName: true, lastName: true } },
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { body: true, createdAt: true, senderId: true },
            },
        },
    });

    return json(convs);
};

// ── POST /api/conversations – Create or return existing ───────────────────────
export const POST: APIRoute = async ({ request, cookies }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    let body: unknown;
    try { body = await request.json(); } catch { return err(400, 'Invalid JSON'); }

    const { listingId } = body as { listingId?: string };
    if (!listingId) return err(400, 'listingId required');

    const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        select: { id: true, sellerId: true, status: true },
    });
    if (!listing) return err(404, 'Listing not found');
    if (listing.status === 'REMOVED') return err(410, 'Listing no longer active');
    if (listing.sellerId === auth.userId) return err(400, 'Cannot message your own listing');

    const conv = await prisma.conversation.upsert({
        where: { listingId_buyerId: { listingId, buyerId: auth.userId } },
        update: {},
        create: { listingId, buyerId: auth.userId, sellerId: listing.sellerId },
        include: {
            listing: { select: { id: true, title: true } },
            buyer: { select: { id: true, firstName: true } },
            seller: { select: { id: true, firstName: true } },
        },
    });

    return json(conv, 201);
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
function err(status: number, error: string) {
    return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });
}
