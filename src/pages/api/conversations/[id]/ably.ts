import type { APIRoute } from 'astro';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { createTokenRequest } from '../../../../lib/ably';
import { prisma } from '../../../../lib/auth';

export const GET: APIRoute = async ({ request, cookies, params }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const conversationId = params.id;
    if (!conversationId) return new Response('Bad request', { status: 400 });

    const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { buyerId: true, sellerId: true }
    });

    if (!conv) return new Response('Not found', { status: 404 });
    if (conv.buyerId !== auth.userId && conv.sellerId !== auth.userId) {
        return new Response('Forbidden', { status: 403 });
    }

    try {
        const tokenRequestData = await createTokenRequest(auth.userId, conversationId);
        return new Response(JSON.stringify(tokenRequestData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        console.error('Ably auth error:', err);
        return new Response('Internal Server Error', { status: 500 });
    }
};
