import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAuth, isAuthContext } from '../../../lib/auth-middleware';
import { checkRateLimit, rateLimitResponse } from '../../../lib/rate-limit';
import { listingDayLimit } from '../../../lib/trust-score';
import { prisma } from '../../../lib/auth';
import { getFallbackListings, shouldUseListingFallback } from '../../../lib/listing-fallback';
import { analyzeListingContent } from '../../../lib/ai-fraud-scanner';

const DAY_MS = 24 * 60 * 60 * 1000;

const ListingQuerySchema = z.object({
    query: z.string().optional(),
    category: z.string().optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    city: z.string().optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radius: z.coerce.number().min(1).max(500).optional(), // km
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['DRAFT', 'ACTIVE', 'RESERVED', 'SOLD', 'ARCHIVED', 'REMOVED']).optional(),
    treuhand: z.coerce.boolean().optional(),
});

/** Haversine-basierte Bounding Box (schneller Vorfilter) */
function geoBoundingBox(lat: number, lng: number, radiusKm: number) {
    const R = 6371; // Erdradius in km
    const dLat = radiusKm / R * (180 / Math.PI);
    const dLng = radiusKm / (R * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);
    return {
        minLat: lat - dLat, maxLat: lat + dLat,
        minLng: lng - dLng, maxLng: lng + dLng,
    };
}

/** Haversine-Distanz in km */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const CreateListingSchema = z.object({
    title: z.string().min(3, 'Titel muss mindestens 3 Zeichen haben.').max(120, 'Titel darf maximal 120 Zeichen haben.'),
    description: z.string().min(10, 'Beschreibung muss mindestens 10 Zeichen haben.').max(5000),
    price: z.number().int().min(0, 'Preis darf nicht negativ sein.'),
    category: z.enum(['ELEKTRONIK', 'FAHRZEUGE', 'MODE', 'MOEBEL', 'SPORT', 'HAUSHALT', 'BUCHER', 'SPIELZEUG', 'SONSTIGES'], { message: 'Ungültige Kategorie.' }),
    city: z.string().max(80).default(''),
    postalCode: z.string().min(4, 'PLZ muss mindestens 4 Zeichen haben.').max(10),
    condition: z.string().optional(),
    treuhand: z.boolean().default(false),
    status: z.enum(['DRAFT', 'ACTIVE']).default('DRAFT'),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
});

// ── GET /api/listings ─────────────────────────────────────────────────────────
export const GET: APIRoute = async ({ url }) => {
    const params = Object.fromEntries(url.searchParams);
    const parsed = ListingQuerySchema.safeParse(params);
    if (!parsed.success) {
        return jsonErr(400, parsed.error.issues[0]?.message ?? 'Bad request');
    }

    if (shouldUseListingFallback()) {
        return json(getFallbackListings(parsed.data));
    }

    const { query, category: rawCategory, minPrice, maxPrice, city, lat, lng, radius, page, pageSize, status, treuhand } = parsed.data;
    const skip = (page - 1) * pageSize;
    const useGeo = lat !== undefined && lng !== undefined && radius !== undefined;

    // Normalize category slug to Prisma enum (uppercase)
    const VALID_CATEGORIES = ['ELEKTRONIK', 'FAHRZEUGE', 'MODE', 'MOEBEL', 'SPORT', 'HAUSHALT', 'BUCHER', 'SPIELZEUG', 'SONSTIGES'];
    const category = rawCategory ? rawCategory.toUpperCase() : undefined;
    const safeCategory = category && VALID_CATEGORIES.includes(category) ? category : undefined;

    const where: Record<string, unknown> = {
        status: status ?? 'ACTIVE',
        seller: { shadowBanned: false },
        ...(safeCategory && { category: safeCategory }),
        ...(treuhand && { treuhand: true }),
        ...(city && !useGeo && { city: { contains: city, mode: 'insensitive' } }),
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

    // Geo-Filter: Bounding-Box als Vorfilter in der DB-Query
    if (useGeo) {
        const bbox = geoBoundingBox(lat!, lng!, radius!);
        where.latitude = { not: null, gte: bbox.minLat, lte: bbox.maxLat };
        where.longitude = { not: null, gte: bbox.minLng, lte: bbox.maxLng };
    }

    try {
        const [total, rawListings] = await Promise.all([
            prisma.listing.count({ where }),
            prisma.listing.findMany({
                where,
                skip,
                take: useGeo ? pageSize * 3 : pageSize, // overfetch for geo-filtering
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true, title: true, price: true, currency: true,
                    category: true, city: true, postalCode: true,
                    latitude: true, longitude: true,
                    status: true, treuhand: true, condition: true,
                    createdAt: true, viewCount: true,
                    seller: { select: { id: true, firstName: true, lastName: true, idVerified: true, trustScore: { select: { score: true, level: true } } } },
                    images: { take: 1, orderBy: { position: 'asc' }, select: { url: true } },
                },
            }),
        ]);

        // Post-filter with exact Haversine distance
        let listings = rawListings;
        if (useGeo) {
            listings = rawListings
                .filter((l: any) => l.latitude && l.longitude && haversineKm(lat!, lng!, l.latitude, l.longitude) <= radius!)
                .slice(0, pageSize);
        }

        return json({ listings, pagination: { total: useGeo ? listings.length : total, page, pageSize, totalPages: useGeo ? 1 : Math.ceil(total / pageSize) } });
    } catch (error) {
        if (shouldUseListingFallback(error)) {
            return json(getFallbackListings(parsed.data));
        }
        throw error;
    }
};

// ── POST /api/listings ────────────────────────────────────────────────────────
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    // Parse & validate FIRST (before rate-limit) so invalid requests don't consume quota
    let body: unknown;
    try { body = await request.json(); } catch { return jsonErr(400, 'Invalid JSON'); }

    const parsed = CreateListingSchema.safeParse(body);
    if (!parsed.success) {
        console.error('[POST /api/listings] Validation failed:', JSON.stringify(parsed.error.issues, null, 2), 'Body:', JSON.stringify(body));
        return jsonErr(400, parsed.error.issues[0]?.message ?? 'Validation error');
    }

    // Rate limit: level-based (NEW=5, BASIC=10, VERIFIED=20, TRUSTED=30, ELITE=50 per day)
    let ts = await prisma.trustScore.findUnique({ where: { userId: auth.userId }, select: { level: true } });
    if (!ts) {
        // Auto-create TrustScore on first listing attempt
        const { refreshTrustScore } = await import('../../../lib/trust-score');
        const created = await refreshTrustScore(auth.userId);
        ts = { level: created.level };
    }
    const limit = listingDayLimit(ts.level);
    if (!checkRateLimit(`listing-create:${auth.userId}`, limit, DAY_MS)) {
        return rateLimitResponse();
    }

    // Ehren-Deal Security: High-Risk Category Check
    const { HIGH_RISK_CATEGORIES, canPostHighRiskItem } = await import('../../../lib/security');
    
    // Check if category is considered high risk (UHREN, AUTOS, SMARTPHONES, SCHMUCK, DESIGNER)
    const isHighRisk = HIGH_RISK_CATEGORIES.includes(parsed.data.category);
                       
    if (isHighRisk) {
        const user = await prisma.user.findUnique({
            where: { id: auth.userId },
            select: { idVerified: true, _count: { select: { fraudSignals: true } } },
        });

        const userForCheck = user ? { idVerified: user.idVerified, fraudSignalCount: user._count.fraudSignals } : null;
        if (!userForCheck || !canPostHighRiskItem(userForCheck)) {
            console.error('[POST /api/listings] HIGH-RISK BLOCK:', parsed.data.category, 'user:', JSON.stringify(userForCheck));
            await prisma.auditLog.create({
                data: { actorId: auth.userId, action: 'listing_blocked_high_risk', ip: clientAddress, metaJson: { category: parsed.data.category } },
            });
            return jsonErr(403, 'Sicherheitsrichtlinie: High-Risk Kategorien erfordern eine verifizierte Identität und einen hohen Trust Score.');
        }
    }

    // KI-Betrugserkennung: Anzeige analysieren
    const fraudResult = await analyzeListingContent(
        parsed.data.title,
        parsed.data.description,
        parsed.data.price,
        parsed.data.category,
    );

    console.log('[POST /api/listings] AI scan result:', fraudResult.action, 'score:', fraudResult.score, 'flags:', fraudResult.flags);
    if (fraudResult.action === 'BLOCK') {
        // Hart blockiert – FraudSignal + AuditLog erstellen, Anzeige ablehnen
        await Promise.all([
            prisma.fraudSignal.create({
                data: {
                    userId: auth.userId,
                    type: 'KI_LISTING_BLOCKED',
                    severity: 'CRITICAL',
                    metaJson: { flags: fraudResult.flags, score: fraudResult.score, title: parsed.data.title },
                },
            }),
            prisma.auditLog.create({
                data: {
                    actorId: auth.userId,
                    action: 'listing_blocked_ki',
                    ip: clientAddress,
                    metaJson: { flags: fraudResult.flags, score: fraudResult.score },
                },
            }),
        ]);
        return jsonErr(403, fraudResult.reason ?? 'Anzeige wurde aus Sicherheitsgründen blockiert.');
    }

    // Bei REVIEW: Status auf DRAFT forcieren (unabhängig von User-Wunsch)
    const finalStatus = fraudResult.action === 'REVIEW' ? 'DRAFT' : parsed.data.status;

    const listing = await prisma.listing.create({
        data: { ...parsed.data, status: finalStatus, sellerId: auth.userId },
    });

    // FraudSignal bei REVIEW erstellen (für Admin-Queue)
    if (fraudResult.action === 'REVIEW') {
        await prisma.fraudSignal.create({
            data: {
                userId: auth.userId,
                type: 'KI_LISTING_REVIEW',
                severity: 'HIGH',
                metaJson: { listingId: listing.id, flags: fraudResult.flags, score: fraudResult.score },
            },
        });
    }

    await prisma.auditLog.create({
        data: {
            actorId: auth.userId,
            action: 'listing_create',
            ip: clientAddress,
            metaJson: {
                listingId: listing.id,
                kiScan: { action: fraudResult.action, score: fraudResult.score, flags: fraudResult.flags },
            },
        },
    });

    return json({
        listing,
        ...(fraudResult.action === 'REVIEW' && { notice: fraudResult.reason }),
    }, 201);
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
function jsonErr(status: number, error: string) {
    return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });
}
