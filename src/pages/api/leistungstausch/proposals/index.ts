import type { APIRoute } from 'astro';
import { prisma } from '../../../../lib/auth';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { ServiceProposalCreateSchema } from '../../../../lib/service-validation';
import { filterServiceContent } from '../../../../lib/service-content-filter';
import { sendProposalReceivedEmail, sendCounterProposalEmail } from '../../../../lib/service-notifications';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await requireAuth(request, cookies);
  if (!isAuthContext(auth)) return auth;

  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Ungültiger Body' }, 400); }

  const parsed = ServiceProposalCreateSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? 'Validierungsfehler', issues: parsed.error.issues }, 400);
  }

  const data = parsed.data;

  const listing = await prisma.serviceListing.findUnique({
    where: { id: data.serviceListingId },
    include: { user: { select: { id: true, email: true, firstName: true } } },
  });
  if (!listing || listing.status !== 'ACTIVE') {
    return json({ error: 'Angebot nicht gefunden oder nicht mehr aktiv.' }, 404);
  }

  if (listing.userId === auth.userId) {
    return json({ error: 'Du kannst keinen Vorschlag für dein eigenes Angebot senden.' }, 400);
  }

  const openCount = await prisma.serviceProposal.count({
    where: { proposerId: auth.userId, status: 'PENDING' },
  });
  if (openCount >= 10) {
    return json({ error: 'Du hast bereits 10 offene Vorschläge. Bitte warte auf Antworten.' }, 429);
  }

  for (const text of [data.offeredDescription, data.soughtDescription, data.message].filter(Boolean)) {
    const result = filterServiceContent(text!);
    if (!result.passed) {
      return json({ error: result.message, rule: result.rule, level: result.level }, 422);
    }
  }

  const offeredCat = await prisma.serviceCategory.findUnique({ where: { id: data.offeredCategoryId } });
  if (!offeredCat) {
    return json({ error: 'Ungültige Kategorie.' }, 400);
  }

  if (data.parentProposalId) {
    const parent = await prisma.serviceProposal.findUnique({ where: { id: data.parentProposalId } });
    if (!parent) {
      return json({ error: 'Originalvorschlag nicht gefunden.' }, 404);
    }
    let depth = 0;
    let current = parent;
    while (current?.parentProposalId && depth < 6) {
      current = await prisma.serviceProposal.findUnique({ where: { id: current.parentProposalId } });
      depth++;
    }
    if (depth >= 5) {
      return json({ error: 'Maximale Anzahl an Gegenvorschlägen erreicht (5). Bitte nutzt den Chat.' }, 400);
    }
    await prisma.serviceProposal.update({
      where: { id: data.parentProposalId },
      data: { status: 'COUNTERED' },
    });
  }

  try {
    const proposal = await prisma.serviceProposal.create({
      data: {
        serviceListingId: data.serviceListingId,
        proposerId: auth.userId,
        receiverId: listing.userId,
        offeredDescription: data.offeredDescription,
        offeredCategoryId: data.offeredCategoryId,
        offeredEffort: data.offeredEffort as any,
        soughtDescription: data.soughtDescription,
        soughtEffort: data.soughtEffort as any,
        locationType: data.locationType as any,
        proposedLocation: data.proposedLocation,
        proposedTimeframe: data.proposedTimeframe,
        message: data.message,
        parentProposalId: data.parentProposalId,
      },
      include: {
        proposer: { select: { id: true, firstName: true, lastName: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, email: true } },
        serviceListing: { select: { id: true, title: true } },
      },
    });

    const proposerName = [auth.user.firstName, auth.user.lastName].filter(Boolean).join(' ') || 'Ein Nutzer';
    const siteUrl = 'https://ehren-deal.de';

    try {
      if (data.parentProposalId) {
        await sendCounterProposalEmail({
          to: listing.user.email,
          proposerName,
          listingTitle: listing.title,
          proposalUrl: `${siteUrl}/leistungstausch/angebot/${listing.id}`,
        });
      } else {
        await sendProposalReceivedEmail({
          to: listing.user.email,
          proposerName,
          listingTitle: listing.title,
          offeredDescription: data.offeredDescription,
          proposalUrl: `${siteUrl}/leistungstausch/angebot/${listing.id}`,
        });
      }
    } catch (emailErr) {
      console.error('[API] Proposal email error (non-blocking):', emailErr);
    }

    return json({ proposal }, 201);
  } catch (err) {
    console.error('[API] POST /api/leistungstausch/proposals error:', err);
    return json({ error: 'Interner Serverfehler' }, 500);
  }
};
