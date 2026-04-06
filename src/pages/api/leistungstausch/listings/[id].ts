import type { APIRoute } from 'astro';
import { prisma } from '../../../../lib/auth';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { ServiceListingUpdateSchema } from '../../../../lib/service-validation';
import { filterServiceListing } from '../../../../lib/service-content-filter';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) return json({ error: 'ID fehlt' }, 400);

  try {
    const listing = await prisma.serviceListing.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true, avatarUrl: true,
            city: true, emailVerified: true, phoneVerified: true, idVerified: true,
            createdAt: true, trustScore: true,
          },
        },
        offeredCategory: { select: { id: true, name: true, slug: true, icon: true } },
        soughtCategories: { include: { category: { select: { id: true, name: true, slug: true, icon: true } } } },
        images: { orderBy: { position: 'asc' } },
      },
    });

    if (!listing || listing.status === 'REMOVED') {
      return json({ error: 'Angebot nicht gefunden' }, 404);
    }

    prisma.serviceListing.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});

    return json({ listing });
  } catch (err) {
    console.error('[API] GET /api/leistungstausch/listings/[id] error:', err);
    return json({ error: 'Interner Serverfehler' }, 500);
  }
};

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(request, cookies);
  if (!isAuthContext(auth)) return auth;

  const { id } = params;
  if (!id) return json({ error: 'ID fehlt' }, 400);

  const listing = await prisma.serviceListing.findUnique({ where: { id } });
  if (!listing) return json({ error: 'Angebot nicht gefunden' }, 404);
  if (listing.userId !== auth.userId) return json({ error: 'Keine Berechtigung' }, 403);

  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Ungültiger Body' }, 400); }

  const parsed = ServiceListingUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? 'Validierungsfehler' }, 400);
  }

  const data = parsed.data;

  const filterInput = {
    title: data.title ?? listing.title,
    offeredDescription: data.offeredDescription ?? listing.offeredDescription,
    soughtDescription: data.soughtDescription ?? listing.soughtDescription,
    requirements: data.requirements ?? listing.requirements ?? undefined,
  };
  const filterResult = filterServiceListing(filterInput);
  if (!filterResult.passed) {
    return json({ error: filterResult.message, rule: filterResult.rule }, 422);
  }

  try {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.offeredDescription !== undefined) updateData.offeredDescription = data.offeredDescription;
    if (data.soughtDescription !== undefined) updateData.soughtDescription = data.soughtDescription;
    if (data.effort !== undefined) updateData.effort = data.effort;
    if (data.locationType !== undefined) updateData.locationType = data.locationType;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.postalCode !== undefined) updateData.postalCode = data.postalCode;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.availability !== undefined) updateData.availability = JSON.stringify(data.availability);
    if (data.experienceLevel !== undefined) updateData.experienceLevel = data.experienceLevel;
    if (data.requirements !== undefined) updateData.requirements = data.requirements;

    if (data.offeredCategoryId !== undefined) {
      const cat = await prisma.serviceCategory.findUnique({ where: { id: data.offeredCategoryId } });
      if (!cat) return json({ error: 'Ungültige Kategorie' }, 400);
      await prisma.serviceCategory.update({ where: { id: listing.offeredCategoryId }, data: { listingCount: { decrement: 1 } } });
      await prisma.serviceCategory.update({ where: { id: data.offeredCategoryId }, data: { listingCount: { increment: 1 } } });
      updateData.offeredCategoryId = data.offeredCategoryId;
    }

    if (data.soughtCategoryIds !== undefined) {
      await prisma.serviceListingSoughtCategory.deleteMany({ where: { serviceListingId: id } });
      await prisma.serviceListingSoughtCategory.createMany({
        data: data.soughtCategoryIds.map(catId => ({ serviceListingId: id, categoryId: catId })),
      });
    }

    const updated = await prisma.serviceListing.update({
      where: { id },
      data: updateData,
      include: {
        offeredCategory: true,
        soughtCategories: { include: { category: true } },
        images: { orderBy: { position: 'asc' } },
      },
    });

    return json({ listing: updated });
  } catch (err) {
    console.error('[API] PUT /api/leistungstausch/listings/[id] error:', err);
    return json({ error: 'Interner Serverfehler' }, 500);
  }
};

export const DELETE: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(request, cookies);
  if (!isAuthContext(auth)) return auth;

  const { id } = params;
  if (!id) return json({ error: 'ID fehlt' }, 400);

  const listing = await prisma.serviceListing.findUnique({ where: { id } });
  if (!listing) return json({ error: 'Angebot nicht gefunden' }, 404);

  if (listing.userId !== auth.userId && auth.user.role !== 'ADMIN') {
    return json({ error: 'Keine Berechtigung' }, 403);
  }

  try {
    await prisma.serviceListing.update({ where: { id }, data: { status: 'REMOVED' } });
    await prisma.serviceCategory.update({
      where: { id: listing.offeredCategoryId },
      data: { listingCount: { decrement: 1 } },
    });
    return json({ success: true });
  } catch (err) {
    console.error('[API] DELETE /api/leistungstausch/listings/[id] error:', err);
    return json({ error: 'Interner Serverfehler' }, 500);
  }
};
