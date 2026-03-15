import type { APIRoute } from 'astro';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { prisma } from '../../../../lib/auth';

export const GET: APIRoute = async ({ request, cookies, params }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const dealId = params.id;
    if (!dealId) return new Response('Bad request', { status: 400 });

    const deal = await prisma.deal.findUnique({
        where: { id: dealId },
        select: { handshakeStatus: true, status: true, buyerId: true, sellerId: true }
    });

    if (!deal) return new Response('Not found', { status: 404 });
    if (deal.buyerId !== auth.userId && deal.sellerId !== auth.userId) {
        return new Response('Forbidden', { status: 403 });
    }

    return new Response(JSON.stringify({ handshakeStatus: deal.handshakeStatus, status: deal.status }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
};
