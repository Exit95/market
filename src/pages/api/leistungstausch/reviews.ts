import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/auth';
import { requireAuth, isAuthContext } from '../../../lib/auth-middleware';
import { ServiceReviewCreateSchema } from '../../../lib/service-validation';
import { filterServiceContent } from '../../../lib/service-content-filter';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await requireAuth(request, cookies);
  if (!isAuthContext(auth)) return auth;

  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Ungültiger Body' }, 400); }

  const parsed = ServiceReviewCreateSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? 'Validierungsfehler' }, 400);
  }

  const { dealId, rating, comment, qualityRating, reliabilityRating, communicationRating } = parsed.data;

  const deal = await prisma.serviceDeal.findUnique({
    where: { id: dealId },
    include: { partyA: { select: { id: true } }, partyB: { select: { id: true } } },
  });

  if (!deal) return json({ error: 'Deal nicht gefunden' }, 404);
  if (deal.status !== 'COMPLETED') {
    return json({ error: 'Bewertungen sind erst nach Abschluss des Deals möglich.' }, 400);
  }

  const isPartyA = deal.partyAId === auth.userId;
  const isPartyB = deal.partyBId === auth.userId;
  if (!isPartyA && !isPartyB) return json({ error: 'Keine Berechtigung' }, 403);

  // Check for existing review
  const existing = await prisma.serviceReview.findUnique({
    where: { dealId_reviewerId: { dealId, reviewerId: auth.userId } },
  });
  if (existing) return json({ error: 'Du hast diesen Deal bereits bewertet.' }, 409);

  // Content filter on comment
  if (comment) {
    const result = filterServiceContent(comment);
    if (!result.passed) {
      return json({ error: result.message, rule: result.rule }, 422);
    }
  }

  const revieweeId = isPartyA ? deal.partyBId : deal.partyAId;

  try {
    const review = await prisma.serviceReview.create({
      data: {
        dealId,
        reviewerId: auth.userId,
        revieweeId,
        rating,
        comment,
        qualityRating,
        reliabilityRating,
        communicationRating,
      },
    });

    return json({ review }, 201);
  } catch (err) {
    console.error('[API] POST /api/leistungstausch/reviews error:', err);
    return json({ error: 'Interner Serverfehler' }, 500);
  }
};
