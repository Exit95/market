import type { APIRoute } from 'astro';
import { prisma } from '../../../../../lib/auth';
import { requireAuth, isAuthContext } from '../../../../../lib/auth-middleware';
import { sendPartyCompletedEmail, sendDealCompletedEmail } from '../../../../../lib/service-notifications';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(request, cookies);
  if (!isAuthContext(auth)) return auth;

  const { id } = params;
  if (!id) return json({ error: 'ID fehlt' }, 400);

  const deal = await prisma.serviceDeal.findUnique({
    where: { id },
    include: {
      partyA: { select: { id: true, firstName: true, lastName: true, email: true } },
      partyB: { select: { id: true, firstName: true, lastName: true, email: true } },
      proposal: { include: { serviceListing: { select: { title: true } } } },
    },
  });

  if (!deal) return json({ error: 'Deal nicht gefunden' }, 404);
  if (deal.status !== 'ACTIVE') return json({ error: 'Dieser Deal ist nicht aktiv.' }, 400);

  const isPartyA = deal.partyAId === auth.userId;
  const isPartyB = deal.partyBId === auth.userId;
  if (!isPartyA && !isPartyB) return json({ error: 'Keine Berechtigung' }, 403);

  if (isPartyA && deal.partyACompleted) return json({ error: 'Du hast deine Seite bereits als erledigt markiert.' }, 400);
  if (isPartyB && deal.partyBCompleted) return json({ error: 'Du hast deine Seite bereits als erledigt markiert.' }, 400);

  try {
    const updateData: any = {};
    if (isPartyA) {
      updateData.partyACompleted = true;
      updateData.partyACompletedAt = new Date();
    } else {
      updateData.partyBCompleted = true;
      updateData.partyBCompletedAt = new Date();
    }

    // Check if both sides will be completed
    const otherCompleted = isPartyA ? deal.partyBCompleted : deal.partyACompleted;
    if (otherCompleted) {
      updateData.status = 'COMPLETED';
      updateData.completedAt = new Date();
    }

    const updated = await prisma.serviceDeal.update({ where: { id }, data: updateData });

    const listingTitle = deal.proposal.serviceListing.title;
    const siteUrl = 'https://ehren-deal.de';
    const dealUrl = `${siteUrl}/leistungstausch/deals/${id}`;

    try {
      if (updated.status === 'COMPLETED') {
        // Both completed — notify both, update listing status, trust score
        const partyAName = [deal.partyA.firstName, deal.partyA.lastName].filter(Boolean).join(' ') || 'Nutzer';
        const partyBName = [deal.partyB.firstName, deal.partyB.lastName].filter(Boolean).join(' ') || 'Nutzer';

        await Promise.all([
          sendDealCompletedEmail({ to: deal.partyA.email, otherName: partyBName, listingTitle }),
          sendDealCompletedEmail({ to: deal.partyB.email, otherName: partyAName, listingTitle }),
        ]);

        // Update listing to COMPLETED
        await prisma.serviceListing.update({
          where: { id: deal.proposal.serviceListing.id },
          data: { status: 'COMPLETED' },
        }).catch(() => {});

        // Trust score +3 for both (update if TrustScore exists)
        for (const userId of [deal.partyAId, deal.partyBId]) {
          await prisma.trustScore.updateMany({
            where: { userId },
            data: { score: { increment: 3 } },
          }).catch(() => {});
        }
      } else {
        // One side completed — notify the other
        const otherParty = isPartyA ? deal.partyB : deal.partyA;
        const completedName = isPartyA
          ? [deal.partyA.firstName, deal.partyA.lastName].filter(Boolean).join(' ') || 'Nutzer'
          : [deal.partyB.firstName, deal.partyB.lastName].filter(Boolean).join(' ') || 'Nutzer';

        await sendPartyCompletedEmail({
          to: otherParty.email,
          otherName: completedName,
          listingTitle,
          dealUrl,
        });
      }
    } catch (emailErr) {
      console.error('[API] Deal complete email error (non-blocking):', emailErr);
    }

    return json({
      success: true,
      completed: updated.status === 'COMPLETED',
      partyACompleted: updated.partyACompleted,
      partyBCompleted: updated.partyBCompleted,
    });
  } catch (err) {
    console.error('[API] POST /api/leistungstausch/deals/[id]/complete error:', err);
    return json({ error: 'Interner Serverfehler' }, 500);
  }
};
