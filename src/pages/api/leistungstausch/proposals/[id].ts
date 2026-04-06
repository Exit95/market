import type { APIRoute } from 'astro';
import { prisma } from '../../../../lib/auth';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { ServiceProposalActionSchema } from '../../../../lib/service-validation';
import { sendProposalAcceptedEmail } from '../../../../lib/service-notifications';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export const GET: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(request, cookies);
  if (!isAuthContext(auth)) return auth;

  const { id } = params;
  if (!id) return json({ error: 'ID fehlt' }, 400);

  const proposal = await prisma.serviceProposal.findUnique({
    where: { id },
    include: {
      proposer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, emailVerified: true, phoneVerified: true } },
      receiver: { select: { id: true, firstName: true, lastName: true } },
      serviceListing: { select: { id: true, title: true, userId: true } },
      counterProposals: {
        orderBy: { createdAt: 'desc' },
        include: {
          proposer: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!proposal) return json({ error: 'Vorschlag nicht gefunden' }, 404);

  if (proposal.proposerId !== auth.userId && proposal.receiverId !== auth.userId) {
    return json({ error: 'Keine Berechtigung' }, 403);
  }

  return json({ proposal });
};

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(request, cookies);
  if (!isAuthContext(auth)) return auth;

  const { id } = params;
  if (!id) return json({ error: 'ID fehlt' }, 400);

  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Ungültiger Body' }, 400); }

  const parsed = ServiceProposalActionSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Aktion' }, 400);
  }

  const { action } = parsed.data;

  const proposal = await prisma.serviceProposal.findUnique({
    where: { id },
    include: {
      serviceListing: { select: { id: true, title: true, userId: true } },
      proposer: { select: { id: true, firstName: true, lastName: true, email: true } },
      receiver: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  if (!proposal) return json({ error: 'Vorschlag nicht gefunden' }, 404);
  if (proposal.status !== 'PENDING') {
    return json({ error: 'Dieser Vorschlag kann nicht mehr bearbeitet werden.' }, 400);
  }

  if (action === 'accept' || action === 'decline') {
    if (proposal.receiverId !== auth.userId) {
      return json({ error: 'Nur der Empfänger kann annehmen oder ablehnen.' }, 403);
    }
  }
  if (action === 'withdraw') {
    if (proposal.proposerId !== auth.userId) {
      return json({ error: 'Nur der Absender kann zurückziehen.' }, 403);
    }
  }

  try {
    if (action === 'accept') {
      await prisma.serviceProposal.update({
        where: { id },
        data: { status: 'ACCEPTED' },
      });

      await prisma.serviceListing.update({
        where: { id: proposal.serviceListingId },
        data: { status: 'MATCHED' },
      });

      await prisma.serviceProposal.updateMany({
        where: {
          serviceListingId: proposal.serviceListingId,
          status: 'PENDING',
          id: { not: id },
        },
        data: { status: 'EXPIRED' },
      });

      const receiverName = [proposal.receiver.firstName, proposal.receiver.lastName].filter(Boolean).join(' ') || 'Ein Nutzer';
      const siteUrl = 'https://ehren-deal.de';
      try {
        await sendProposalAcceptedEmail({
          to: proposal.proposer.email,
          otherName: receiverName,
          listingTitle: proposal.serviceListing.title,
          dealUrl: `${siteUrl}/leistungstausch/angebot/${proposal.serviceListingId}`,
        });
      } catch (emailErr) {
        console.error('[API] Accept email error (non-blocking):', emailErr);
      }

      return json({ success: true, status: 'ACCEPTED', message: 'Vorschlag angenommen. Der Deal ist jetzt aktiv!' });

    } else if (action === 'decline') {
      await prisma.serviceProposal.update({
        where: { id },
        data: { status: 'DECLINED' },
      });
      return json({ success: true, status: 'DECLINED' });

    } else if (action === 'withdraw') {
      await prisma.serviceProposal.update({
        where: { id },
        data: { status: 'WITHDRAWN' },
      });
      return json({ success: true, status: 'WITHDRAWN' });
    }

    return json({ error: 'Ungültige Aktion' }, 400);
  } catch (err) {
    console.error('[API] PUT /api/leistungstausch/proposals/[id] error:', err);
    return json({ error: 'Interner Serverfehler' }, 500);
  }
};
