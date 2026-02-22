import type { APIRoute } from 'astro';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { requireAuth, isAuthContext } from '../../../lib/auth-middleware';
import { checkRateLimit, rateLimitResponse } from '../../../lib/rate-limit';
import { presignPut, publicUrl } from '../../../lib/s3';
import { prisma } from '../../../lib/auth';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_SIZE = 8 * 1024 * 1024; // 8 MB

const PresignSchema = z.object({
    type: z.enum(['listingImage', 'avatar']),
    listingId: z.string().optional(),
    contentType: z.enum(ALLOWED_TYPES),
    size: z.number().int().min(1).max(MAX_SIZE),
});

const EXT: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    // Rate limit: 30 presigns/hour
    if (!checkRateLimit(`presign:${auth.userId}`, 30, 60 * 60 * 1000)) {
        return rateLimitResponse(3600);
    }

    let body: unknown;
    try { body = await request.json(); } catch { return err(400, 'Invalid JSON'); }

    const parsed = PresignSchema.safeParse(body);
    if (!parsed.success) return err(400, parsed.error.issues[0]?.message ?? 'Validation error');

    const { type, listingId, contentType, size } = parsed.data;

    // Build object key with prefix guard
    let objectKey: string;
    if (type === 'listingImage') {
        if (!listingId) return err(400, 'listingId required for listingImage');

        // Verify listing exists and belongs to user (or admin)
        const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { sellerId: true } });
        if (!listing) return err(404, 'Listing not found');
        if (listing.sellerId !== auth.userId && auth.user.role !== 'ADMIN') return err(403, 'Forbidden');

        objectKey = `listings/${listingId}/${randomUUID()}.${EXT[contentType]}`;
    } else {
        // avatar
        objectKey = `avatars/${auth.userId}/${randomUUID()}.${EXT[contentType]}`;
    }

    const uploadUrl = await presignPut(objectKey, contentType, 300);
    const pubUrl = publicUrl(objectKey);

    return json({ uploadUrl, objectKey, publicUrl: pubUrl, expiresIn: 300 });
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
function err(status: number, error: string) {
    return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });
}
