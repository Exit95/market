import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAuth, isAuthContext } from '../../../lib/auth-middleware';
import { checkRateLimit, rateLimitResponse } from '../../../lib/rate-limit';
import { listingDayLimit } from '../../../lib/trust-score';
import { prisma } from '../../../lib/auth';

const DAY_MS = 24 * 60 * 60 * 1000;

const ListingQuerySchema = z.object({
    query: z.string().optional(),
    category: z.string().optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    city: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['DRAFT', 'ACTIVE', 'RESERVED', 'SOLD', 'ARCHIVED', 'REMOVED']).optional(),
});

const CreateListingSchema = z.object({
    title: z.string().min(3).max(120),
    description: z.string().min(10).max(5000),
    price: z.number().int().min(0),   // Cent
    category: z.enum(['ELEKTRONIK', 'FAHRZEUGE', 'MODE', 'MOEBEL', 'SPORT', 'HAUSHALT', 'BUCHER', 'SPIELZEUG', 'SONSTIGES']),
    city: z.string().min(2).max(80),
    postalCode: z.string().min(4).max(10),
    condition: z.string().optional(),
    treuhand: z.boolean().default(false),
    status: z.enum(['DRAFT', 'ACTIVE']).default('DRAFT'),
});

// ── GET /api/listings ─────────────────────────────────────────────────────────
export const GET: APIRoute = async ({ url }) => {
    const params = Object.fromEntries(url.searchParams);
    const parsed = ListingQuerySchema.safeParse(params);
    if (!parsed.success) {
        return jsonErr(400, parsed.error.issues[0]?.message ?? 'Bad request');
    }

    const { query, category, minPrice, maxPrice, city, page, pageSize, status } = parsed.data;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
        status: status ?? 'ACTIVE',
        // Hide listings from shadow-banned sellers (they don't know)
        seller: { shadowBanned: false },
        ...(category && { category }),
        ...(city && { city: { contains: city, mode: 'insensitive' } }),
        ...(minPrice !== undefined || maxPrice !== undefined
            ? { price: { ...(minPrice !== undefined && { gte: minPrice }), ...(maxPrice !== undefined && { lte: maxPrice }) } }
            : {}),
        ...(query && {
            OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
            ],
        }),
    };

    const [total, listings] = await Promise.all([
        prisma.listing.count({ where }),
        prisma.listing.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, title: true, price: true, currency: true,
                category: true, city: true, postalCode: true,
                status: true, treuhand: true, condition: true,
                createdAt: true, viewCount: true,
                seller: { select: { id: true, firstName: true, lastName: true, idVerified: true, trustScore: { select: { score: true, level: true } } } },
                images: { take: 1, orderBy: { position: 'asc' }, select: { url: true } },
            },
        }),
    ]);

    return json({ listings, pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } });
};

// ── POST /api/listings ────────────────────────────────────────────────────────
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    // Rate limit: level-based (NEW=2, BASIC=5, VERIFIED=10, TRUSTED=20, ELITE=50 per day)
    const ts = await prisma.trustScore.findUnique({ where: { userId: auth.userId }, select: { level: true } });
    const limit = listingDayLimit(ts?.level ?? 'NEW');
    if (!checkRateLimit(`listing-create:${auth.userId}`, limit, DAY_MS)) {
        return rateLimitResponse();
    }

    let body: unknown;
    try { body = await request.json(); } catch { return jsonErr(400, 'Invalid JSON'); }

    const parsed = CreateListingSchema.safeParse(body);
    if (!parsed.success) return jsonErr(400, parsed.error.issues[0]?.message ?? 'Validation error');

    const listing = await prisma.listing.create({
        data: { ...parsed.data, sellerId: auth.userId },
    });

    await prisma.auditLog.create({
        data: { actorId: auth.userId, action: 'listing_create', ip: clientAddress, metaJson: { listingId: listing.id } },
    });

    return json({ listing }, 201);
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
function jsonErr(status: number, error: string) {
    return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });
}
