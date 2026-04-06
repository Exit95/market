import type { APIRoute } from 'astro';
import { prisma } from '../../../../lib/auth';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export const GET: APIRoute = async ({ request, cookies, url }) => {
  const auth = await requireAuth(request, cookies);
  if (!isAuthContext(auth)) return auth;

  const status = url.searchParams.get('status') || undefined;
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20'), 50);
  const skip = (page - 1) * pageSize;

  const where: any = {
    OR: [{ partyAId: auth.userId }, { partyBId: auth.userId }],
  };
  if (status) where.status = status;

  try {
    const [deals, total] = await Promise.all([
      prisma.serviceDeal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          proposal: {
            include: {
              serviceListing: { select: { id: true, title: true, offeredCategory: { select: { name: true, slug: true } } } },
            },
          },
          partyA: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          partyB: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      }),
      prisma.serviceDeal.count({ where }),
    ]);

    return json({ deals, pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } });
  } catch (err) {
    console.error('[API] GET /api/leistungstausch/deals error:', err);
    return json({ error: 'Interner Serverfehler' }, 500);
  }
};
