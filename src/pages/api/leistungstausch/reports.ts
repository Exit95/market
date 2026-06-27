import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/auth';
import { requireAuth, isAuthContext } from '../../../lib/auth-middleware';
import { ServiceReportSchema } from '../../../lib/service-validation';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await requireAuth(request, cookies);
  if (!isAuthContext(auth)) return auth;

  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Ungültiger Body' }, 400); }

  const parsed = ServiceReportSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? 'Validierungsfehler' }, 400);
  }

  const { serviceListingId, reason, description } = parsed.data;

  const listing = await prisma.serviceListing.findUnique({ where: { id: serviceListingId } });
  if (!listing) return json({ error: 'Angebot nicht gefunden' }, 404);

  if (listing.userId === auth.userId) {
    return json({ error: 'Du kannst dein eigenes Angebot nicht melden.' }, 400);
  }

  const existing = await prisma.serviceListingReport.findUnique({
    where: { serviceListingId_reporterId: { serviceListingId, reporterId: auth.userId } },
  });
  if (existing) {
    return json({ error: 'Du hast dieses Angebot bereits gemeldet.' }, 409);
  }

  try {
    const report = await prisma.serviceListingReport.create({
      data: {
        serviceListingId,
        reporterId: auth.userId,
        reason: reason as any,
        description,
      },
    });

    const reportCount = await prisma.serviceListingReport.count({ where: { serviceListingId } });
    if (reportCount >= 3 && listing.status === 'ACTIVE') {
      await prisma.serviceListing.update({
        where: { id: serviceListingId },
        data: { status: 'PAUSED' },
      });
    }

    return json({ report }, 201);
  } catch (err) {
    console.error('[API] POST /api/leistungstausch/reports error:', err);
    return json({ error: 'Interner Serverfehler' }, 500);
  }
};
