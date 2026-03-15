/**
 * src/pages/api/upload.ts
 * Legacy direct-upload endpoint (kept for backwards compat).
 * Prefer /api/uploads/presign + /api/uploads/confirm for new code.
 */
import type { APIRoute } from 'astro';
import { requireAuth, isAuthContext } from '../../lib/auth-middleware';
import { deleteObject } from '../../lib/s3';
import { prisma } from '../../lib/auth';

export const DELETE: APIRoute = async ({ request, cookies }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const { key } = await request.json().catch(() => ({}));
    if (!key || typeof key !== 'string') {
        return new Response(JSON.stringify({ error: 'key required' }), { status: 400 });
    }

    // Ownership check: key must match a prefix the user owns, or user must be admin
    if (auth.user.role !== 'ADMIN') {
        if (key.startsWith('listings/')) {
            // Extract listingId from key pattern: listings/<listingId>/...
            const parts = key.split('/');
            const listingId = parts[1];
            if (!listingId) {
                return new Response(JSON.stringify({ error: 'Invalid key format' }), { status: 400 });
            }
            const listing = await prisma.listing.findUnique({
                where: { id: listingId },
                select: { sellerId: true },
            });
            if (!listing || listing.sellerId !== auth.userId) {
                return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
            }
        } else if (key.startsWith('avatars/')) {
            // Avatar keys: avatars/<userId>/...
            const parts = key.split('/');
            const ownerUserId = parts[1];
            if (ownerUserId !== auth.userId) {
                return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
            }
        } else {
            // Unknown prefix – deny
            return new Response(JSON.stringify({ error: 'Forbidden: unknown key prefix' }), { status: 403 });
        }
    }

    await deleteObject(key);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
