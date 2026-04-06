import type { APIRoute } from 'astro';
import { prisma } from '../../../../lib/auth';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export const GET: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(request, cookies);
  if (!isAuthContext(auth)) return auth;

  const { id } = params;
  if (!id) return json({ error: 'ID fehlt' }, 400);

  try {
    const deal = await prisma.serviceDeal.findUnique({
      where: { id },
      include: {
        proposal: {
          include: {
            serviceListing: {
              select: { id: true, title: true, offeredDescription: true, soughtDescription: true,
                offeredCategory: { select: { name: true, slug: true } },
                soughtCategories: { include: { category: { select: { name: true } } } },
              },
            },
            proposer: { select: { id: true, firstName: true, lastName: true } },
            receiver: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        partyA: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, emailVerified: true, phoneVerified: true } },
        partyB: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, emailVerified: true, phoneVerified: true } },
        reviews: { select: { id: true, reviewerId: true, rating: true, createdAt: true } },
        dispute: { select: { id: true, status: true, reason: true } },
      },
    });

    if (!deal) return json({ error: 'Deal nicht gefunden' }, 404);
    if (deal.partyAId !== auth.userId && deal.partyBId !== auth.userId) {
      return json({ error: 'Keine Berechtigung' }, 403);
    }

    return json({ deal });
  } catch (err) {
    console.error('[API] GET /api/leistungstausch/deals/[id] error:', err);
    return json({ error: 'Interner Serverfehler' }, 500);
  }
};
