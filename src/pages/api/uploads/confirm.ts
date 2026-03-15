import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAuth, isAuthContext } from '../../../lib/auth-middleware';
import { prisma } from '../../../lib/auth';

const ConfirmSchema = z.object({
    listingId: z.string(),
    objectKey: z.string().regex(/^(listings|avatars)\//, 'Invalid objectKey prefix'),
    publicUrl: z.string().url(),
    position: z.number().int().min(0).default(0),
});

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    let body: unknown;
    try { body = await request.json(); } catch { return err(400, 'Invalid JSON'); }

    const parsed = ConfirmSchema.safeParse(body);
    if (!parsed.success) return err(400, parsed.error.issues[0]?.message ?? 'Validation error');

    const { listingId, objectKey, publicUrl, position } = parsed.data;

    // Verify ownership
    const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { sellerId: true } });
    if (!listing) return err(404, 'Listing not found');
    if (listing.sellerId !== auth.userId && auth.user.role !== 'ADMIN') return err(403, 'Forbidden');

    // Ensure objectKey prefix matches listingId guard
    if (!objectKey.startsWith(`listings/${listingId}/`)) {
        return err(400, 'objectKey does not match listingId');
    }

    const image = await prisma.listingImage.create({
        data: { listingId, objectKey, url: publicUrl, position },
    });

    await prisma.auditLog.create({
        data: {
            actorId: auth.userId,
            action: 'listing_image_upload',
            ip: clientAddress,
            metaJson: { listingId, objectKey },
        },
    });

    return new Response(JSON.stringify({ ok: true, image }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
    });
};

function err(status: number, error: string) {
    return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });
}
