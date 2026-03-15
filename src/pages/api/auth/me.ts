import type { APIRoute } from 'astro';
import { requireAuth, isAuthContext } from '../../../lib/auth-middleware';

export const GET: APIRoute = async ({ request, cookies }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth; // 401

    return new Response(JSON.stringify({
        ok: true,
        user: {
            id: auth.userId,
            ...auth.user,
        },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
