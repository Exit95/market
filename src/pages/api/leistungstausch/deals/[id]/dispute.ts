import type { APIRoute } from 'astro';
import { prisma } from '../../../../../lib/auth';
import { requireAuth, isAuthContext } from '../../../../../lib/auth-middleware';
import { ServiceDisputeCreateSchema } from '../../../../../lib/service-validation';
import { sendDealDisputedEmail } from '../../../../../lib/service-notifications';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

const REASON_LABELS: Record<string, string> = {
  NICHT_ERSCHIENEN: 'Nicht erschienen',
  LEISTUNG_MANGELHAFT: 'Leistung mangelhaft',
  ANDERE_LEISTUNG: 'Andere Leistung als vereinbart',
  KEINE_LEISTUNG: 'Keine Leistung erbracht',
  KOMMUNIKATION: 'Kommunikation abgebrochen',
  SONSTIGES: 'Sonstiges',
};

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(request, cookies);
  if (!isAuthContext(auth)) return auth;

  const { id } = params;
  if (!id) return json({ error: 'ID fehlt' }, 400);

  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Ungültiger Body' }, 400); }

  // Override dealId from URL param
  const parsed = ServiceDisputeCreateSchema.safeParse({ ...(body as any), dealId: id });
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? 'Validierungsfehler' }, 400);
  }

  const { reason, description } = parsed.data;

  const deal = await prisma.serviceDeal.findUnique({
    where: { id },
    include: {
      partyA: { select: { id: true, firstName: true, lastName: true, email: true } },
      partyB: { select: { id: true, firstName: true, lastName: true, email: true } },
      proposal: { include: { serviceListing: { select: { title: true } } } },
      dispute: true,
    },
  });

  if (!deal) return json({ error: 'Deal nicht gefunden' }, 404);
  if (deal.status !== 'ACTIVE') {
    return json({ error: 'Disputes können nur für aktive Deals eröffnet werden.' }, 400);
  }

  const isPartyA = deal.partyAId === auth.userId;
  const isPartyB = deal.partyBId === auth.userId;
  if (!isPartyA && !isPartyB) return json({ error: 'Keine Berechtigung' }, 403);

  if (deal.dispute) {
    return json({ error: 'Für diesen Deal wurde bereits ein Dispute eröffnet.' }, 409);
  }

  try {
    const dispute = await prisma.serviceDispute.create({
      data: {
        dealId: id,
        openedById: auth.userId,
        reason: reason as any,
        description,
      },
    });

    // Update deal status
    await prisma.serviceDeal.update({
      where: { id },
      data: { status: 'DISPUTED' },
    });

    // Notify other party
    const otherParty = isPartyA ? deal.partyB : deal.partyA;
    const openerName = [auth.user.firstName, auth.user.lastName].filter(Boolean).join(' ') || 'Ein Nutzer';
    const siteUrl = 'https://ehren-deal.de';

    try {
      await sendDealDisputedEmail({
        to: otherParty.email,
        otherName: openerName,
        listingTitle: deal.proposal.serviceListing.title,
        reason: REASON_LABELS[reason] ?? reason,
        dealUrl: `${siteUrl}/leistungstausch/deals/${id}`,
      });
    } catch (emailErr) {
      console.error('[API] Dispute email error (non-blocking):', emailErr);
    }

    return json({ dispute }, 201);
  } catch (err) {
    console.error('[API] POST /api/leistungstausch/deals/[id]/dispute error:', err);
    return json({ error: 'Interner Serverfehler' }, 500);
  }
};
