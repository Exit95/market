/**
 * src/pages/api/upload.ts
 * Legacy direct-upload endpoint (kept for backwards compat).
 * Prefer /api/uploads/presign + /api/uploads/confirm for new code.
 */
import type { APIRoute } from 'astro';
import { requireAuth, isAuthContext } from '../../lib/auth-middleware';
import { deleteObject } from '../../lib/s3';

export const DELETE: APIRoute = async ({ request, cookies }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const { key } = await request.json().catch(() => ({}));
    if (!key) return new Response(JSON.stringify({ error: 'key required' }), { status: 400 });

    await deleteObject(key);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
