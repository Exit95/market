import type { APIRoute } from 'astro';
import { prisma } from '../../../../../lib/auth';
import { requireAuth, isAuthContext } from '../../../../../lib/auth-middleware';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(request, cookies);
  if (!isAuthContext(auth)) return auth;

  const { id } = params;
  if (!id) return json({ error: 'ID fehlt' }, 400);

  let body: unknown;
  try { body = await request.json(); } catch { body = {}; }
  const reason = (body as any)?.reason ?? '';

  const deal = await prisma.serviceDeal.findUnique({ where: { id } });
  if (!deal) return json({ error: 'Deal nicht gefunden' }, 404);
  if (deal.status !== 'ACTIVE') return json({ error: 'Dieser Deal ist nicht aktiv.' }, 400);

  const isPartyA = deal.partyAId === auth.userId;
  const isPartyB = deal.partyBId === auth.userId;
  if (!isPartyA && !isPartyB) return json({ error: 'Keine Berechtigung' }, 403);

  try {
    // Two-step cancel: first request, then confirm by other party
    if (!deal.cancelRequestedBy) {
      // First cancel request
      await prisma.serviceDeal.update({
        where: { id },
        data: { cancelRequestedBy: auth.userId, cancelReason: reason },
      });
      return json({ success: true, status: 'CANCEL_REQUESTED', message: 'Abbruch-Anfrage gesendet. Die andere Seite muss bestätigen.' });
    } else if (deal.cancelRequestedBy !== auth.userId) {
      // Other party confirms
      await prisma.serviceDeal.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });

      // Re-activate listing
      const proposal = await prisma.serviceProposal.findUnique({
        where: { id: deal.proposalId },
        select: { serviceListingId: true },
      });
      if (proposal) {
        await prisma.serviceListing.update({
          where: { id: proposal.serviceListingId },
          data: { status: 'ACTIVE' },
        }).catch(() => {});
      }

      return json({ success: true, status: 'CANCELLED', message: 'Deal wurde einvernehmlich abgebrochen.' });
    } else {
      return json({ error: 'Du hast den Abbruch bereits angefragt. Warte auf die Bestätigung der anderen Seite.' }, 400);
    }
  } catch (err) {
    console.error('[API] POST /api/leistungstausch/deals/[id]/cancel error:', err);
    return json({ error: 'Interner Serverfehler' }, 500);
  }
};
