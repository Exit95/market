import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/auth';
import { requireAuth, isAuthContext } from '../../../lib/auth-middleware';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export const GET: APIRoute = async ({ request, cookies, url }) => {
  const auth = await requireAuth(request, cookies);
  if (!isAuthContext(auth)) return auth;

  const listingId = url.searchParams.get('listingId');
  if (!listingId) return json({ error: 'listingId erforderlich' }, 400);

  // Get the source listing
  const listing = await prisma.serviceListing.findUnique({
    where: { id: listingId },
    include: {
      soughtCategories: { select: { categoryId: true } },
    },
  });

  if (!listing) return json({ error: 'Angebot nicht gefunden' }, 404);
  if (listing.userId !== auth.userId) return json({ error: 'Keine Berechtigung' }, 403);

  const soughtCategoryIds = listing.soughtCategories.map(sc => sc.categoryId);
  const offeredCategoryId = listing.offeredCategoryId;

  // Find listings that:
  // 1. Offer one of the categories we're seeking (their offeredCategoryId IN our soughtCategoryIds)
  // 2. Seek the category we're offering (their soughtCategories includes our offeredCategoryId)
  // 3. Are ACTIVE and not expired and not our own
  const matches = await prisma.serviceListing.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { gte: new Date() },
      userId: { not: auth.userId },
      offeredCategoryId: { in: soughtCategoryIds },
      soughtCategories: {
        some: { categoryId: offeredCategoryId },
      },
    },
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, emailVerified: true, phoneVerified: true } },
      offeredCategory: { select: { id: true, name: true, slug: true } },
      soughtCategories: { include: { category: { select: { id: true, name: true, slug: true } } } },
      images: { orderBy: { position: 'asc' }, take: 1 },
    },
  });

  // Calculate match score for each
  const scoredMatches = matches.map(match => {
    let score = 50; // Base: category match

    // Effort similarity
    if (match.effort === listing.effort) score += 20;

    // Location compatibility
    if (match.locationType === listing.locationType) score += 10;
    if (match.locationType === 'BEIDES' || listing.locationType === 'BEIDES') score += 5;

    // Verified user bonus
    if (match.user.emailVerified && match.user.phoneVerified) score += 5;

    // Location proximity (if both have coordinates)
    if (match.latitude && match.longitude && listing.latitude && listing.longitude) {
      const R = 6371;
      const dLat = (match.latitude - listing.latitude) * Math.PI / 180;
      const dLng = (match.longitude - listing.longitude) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(listing.latitude * Math.PI / 180) * Math.cos(match.latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (km <= 25) score += 15;
      else if (km <= 50) score += 10;
      else if (km <= 100) score += 5;
    }

    return { ...match, matchScore: Math.min(score, 100) };
  });

  // Sort by score descending
  scoredMatches.sort((a, b) => b.matchScore - a.matchScore);

  return json({ matches: scoredMatches, total: scoredMatches.length });
};
