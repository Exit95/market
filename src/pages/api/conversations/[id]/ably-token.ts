import type { APIRoute } from 'astro';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { createTokenRequest } from '../../../../lib/ably';
import { prisma } from '../../../../lib/auth';

/**
 * GET /api/conversations/:id/ably-token
 * Returns a scoped Ably token request for the frontend client.
 */
export const GET: APIRoute = async ({ request, cookies, params }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const conv = await prisma.conversation.findUnique({ where: { id: params.id } });
    if (!conv) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    if (conv.buyerId !== auth.userId && conv.sellerId !== auth.userId) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    const tokenRequest = await createTokenRequest(auth.userId, params.id!);
    return new Response(JSON.stringify(tokenRequest), {
        headers: { 'Content-Type': 'application/json' },
    });
};
