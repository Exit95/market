import type { APIRoute } from 'astro';
import { prisma } from '../../../../lib/auth';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { ServiceListingQuerySchema, ServiceListingCreateSchema } from '../../../../lib/service-validation';
import { filterServiceListing } from '../../../../lib/service-content-filter';

function geoBoundingBox(lat: number, lng: number, radiusKm: number) {
  const R = 6371;
  const dLat = radiusKm / R * (180 / Math.PI);
  const dLng = radiusKm / (R * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng };
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export const GET: APIRoute = async ({ url }) => {
  const params = Object.fromEntries(url.searchParams);
  const parsed = ServiceListingQuerySchema.safeParse(params);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Parameter' }, 400);
  }

  const {
    query, offeredCategory, soughtCategory, city, lat, lng, radius,
    locationType, effort, availability, experienceLevel, verifiedOnly,
    sortBy, page, pageSize,
  } = parsed.data;

  const skip = (page - 1) * pageSize;
  const useGeo = lat !== undefined && lng !== undefined && radius !== undefined;

  const where: any = { status: 'ACTIVE', expiresAt: { gte: new Date() } };

  if (query) {
    where.OR = [
      { title: { contains: query } },
      { offeredDescription: { contains: query } },
      { soughtDescription: { contains: query } },
    ];
  }

  if (offeredCategory) {
    const cat = await prisma.serviceCategory.findUnique({ where: { slug: offeredCategory } });
    if (cat) where.offeredCategoryId = cat.id;
  }

  if (soughtCategory) {
    const cat = await prisma.serviceCategory.findUnique({ where: { slug: soughtCategory } });
    if (cat) {
      where.soughtCategories = { some: { categoryId: cat.id } };
    }
  }

  if (city) where.city = { contains: city };
  if (locationType) where.locationType = locationType;

  if (effort) {
    const efforts = effort.split(',').filter(Boolean);
    if (efforts.length > 0) where.effort = { in: efforts };
  }

  if (experienceLevel) {
    const levels = experienceLevel.split(',').filter(Boolean);
    if (levels.length > 0) where.experienceLevel = { in: levels };
  }

  if (verifiedOnly) {
    where.user = { emailVerified: true, phoneVerified: true };
  }

  if (useGeo) {
    const box = geoBoundingBox(lat, lng, radius);
    where.latitude = { gte: box.minLat, lte: box.maxLat };
    where.longitude = { gte: box.minLng, lte: box.maxLng };
  }

  let orderBy: any = { createdAt: 'desc' };

  try {
    const [listings, total] = await Promise.all([
      prisma.serviceListing.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, emailVerified: true, phoneVerified: true, idVerified: true, city: true } },
          offeredCategory: { select: { id: true, name: true, slug: true, icon: true } },
          soughtCategories: { include: { category: { select: { id: true, name: true, slug: true } } } },
          images: { orderBy: { position: 'asc' }, take: 1 },
        },
      }),
      prisma.serviceListing.count({ where }),
    ]);

    let filteredListings = listings;
    if (useGeo) {
      filteredListings = listings.filter(l =>
        l.latitude && l.longitude && haversineKm(lat, lng, l.latitude, l.longitude) <= radius
      );
    }

    return json({
      listings: filteredListings,
      pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    console.error('[API] GET /api/leistungstausch/listings error:', err);
    return json({ error: 'Interner Serverfehler' }, 500);
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await requireAuth(request, cookies);
  if (!isAuthContext(auth)) return auth;

  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Ungültiger Request-Body' }, 400); }

  const parsed = ServiceListingCreateSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? 'Validierungsfehler', issues: parsed.error.issues }, 400);
  }

  const data = parsed.data;

  const activeCount = await prisma.serviceListing.count({
    where: { userId: auth.userId, status: 'ACTIVE' },
  });
  if (activeCount >= 5) {
    return json({ error: 'Du kannst maximal 5 aktive Leistungstausch-Angebote haben.' }, 429);
  }

  const filterResult = filterServiceListing({
    title: data.title,
    offeredDescription: data.offeredDescription,
    soughtDescription: data.soughtDescription,
    requirements: data.requirements,
  });

  if (!filterResult.passed) {
    return json({ error: filterResult.message, rule: filterResult.rule, level: filterResult.level }, 422);
  }

  const offeredCat = await prisma.serviceCategory.findUnique({ where: { id: data.offeredCategoryId } });
  if (!offeredCat) return json({ error: 'Ungültige Kategorie.' }, 400);

  const soughtCats = await prisma.serviceCategory.findMany({
    where: { id: { in: data.soughtCategoryIds } },
  });
  if (soughtCats.length !== data.soughtCategoryIds.length) {
    return json({ error: 'Eine oder mehrere gesuchte Kategorien sind ungültig.' }, 400);
  }

  try {
    const listing = await prisma.serviceListing.create({
      data: {
        title: data.title,
        offeredDescription: data.offeredDescription,
        soughtDescription: data.soughtDescription,
        effort: data.effort as any,
        locationType: data.locationType as any,
        city: data.city,
        postalCode: data.postalCode,
        latitude: data.latitude,
        longitude: data.longitude,
        availability: data.availability ? JSON.stringify(data.availability) : null,
        experienceLevel: data.experienceLevel as any ?? null,
        requirements: data.requirements,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        userId: auth.userId,
        offeredCategoryId: data.offeredCategoryId,
        soughtCategories: {
          create: data.soughtCategoryIds.map(catId => ({ categoryId: catId })),
        },
      },
      include: {
        offeredCategory: true,
        soughtCategories: { include: { category: true } },
      },
    });

    await prisma.serviceCategory.update({
      where: { id: data.offeredCategoryId },
      data: { listingCount: { increment: 1 } },
    });

    return json({ listing }, 201);
  } catch (err) {
    console.error('[API] POST /api/leistungstausch/listings error:', err);
    return json({ error: 'Interner Serverfehler' }, 500);
  }
};
