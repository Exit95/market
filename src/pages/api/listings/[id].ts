import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAuth, isAuthContext } from '../../../lib/auth-middleware';
import { prisma } from '../../../lib/auth';

const PatchSchema = z.object({
    title: z.string().min(3).max(120).optional(),
    description: z.string().min(10).max(5000).optional(),
    price: z.number().int().min(0).optional(),
    category: z.enum(['ELEKTRONIK', 'FAHRZEUGE', 'MODE', 'MOEBEL', 'SPORT', 'HAUSHALT', 'BUCHER', 'SPIELZEUG', 'SONSTIGES']).optional(),
    city: z.string().min(2).max(80).optional(),
    postalCode: z.string().optional(),
    condition: z.string().optional(),
    treuhand: z.boolean().optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED', 'SOLD']).optional(),
}).strict();

// ── GET /api/listings/:id ─────────────────────────────────────────────────────
export const GET: APIRoute = async ({ params }) => {
    const listing = await prisma.listing.findUnique({
        where: { id: params.id },
        include: {
            seller: { select: { id: true, firstName: true, lastName: true, idVerified: true, emailVerified: true, createdAt: true } },
            images: { orderBy: { position: 'asc' } },
        },
    });

    if (!listing) return jsonErr(404, 'Listing not found');

    // Increment view count (fire-and-forget)
    prisma.listing.update({ where: { id: params.id! }, data: { viewCount: { increment: 1 } } }).catch(() => { });

    return json(listing);
};

// ── PATCH /api/listings/:id ───────────────────────────────────────────────────
export const PATCH: APIRoute = async ({ request, cookies, params, clientAddress }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const listing = await prisma.listing.findUnique({ where: { id: params.id }, select: { sellerId: true } });
    if (!listing) return jsonErr(404, 'Listing not found');
    if (listing.sellerId !== auth.userId && auth.user.role !== 'ADMIN') {
        return jsonErr(403, 'Forbidden');
    }

    let body: unknown;
    try { body = await request.json(); } catch { return jsonErr(400, 'Invalid JSON'); }
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return jsonErr(400, parsed.error.issues[0]?.message ?? 'Validation error');

    const updated = await prisma.listing.update({
        where: { id: params.id },
        data: parsed.data,
    });

    await prisma.auditLog.create({
        data: { actorId: auth.userId, action: 'listing_update', ip: clientAddress, metaJson: { listingId: params.id, changes: parsed.data } },
    });

    return json(updated);
};

// ── DELETE /api/listings/:id ──────────────────────────────────────────────────
export const DELETE: APIRoute = async ({ request, cookies, params, clientAddress }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const listing = await prisma.listing.findUnique({ where: { id: params.id }, select: { sellerId: true } });
    if (!listing) return jsonErr(404, 'Listing not found');
    if (listing.sellerId !== auth.userId && auth.user.role !== 'ADMIN') {
        return jsonErr(403, 'Forbidden');
    }

    // Soft-delete via status
    await prisma.listing.update({ where: { id: params.id }, data: { status: 'REMOVED' } });

    await prisma.auditLog.create({
        data: { actorId: auth.userId, action: 'listing_delete', ip: clientAddress, metaJson: { listingId: params.id } },
    });

    return json({ ok: true });
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
function jsonErr(status: number, error: string) {
    return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });
}
