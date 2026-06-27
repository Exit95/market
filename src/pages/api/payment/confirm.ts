import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/auth';
import { requireAuth, isAuthContext } from '../../../lib/auth-middleware';
import { notifyFundsReleased } from '../../../lib/notifications';
import { calcSellerPayout } from '../../../lib/stripe';

/**
 * POST /api/payment/confirm
 * Käufer bestätigt Warenerhalt → Deal wird als COMPLETED markiert.
 * Bei Stripe: Die Zahlung wurde bereits über Checkout erfasst. Hier wird nur der Deal-Status aktualisiert
 * und der Verkäufer benachrichtigt.
 *
 * Body: { dealId: string }
 */
export const POST: APIRoute = async ({ request, cookies }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    try {
        const body = await request.json();
        const { dealId } = body as { dealId?: string };

        if (!dealId) {
            return new Response(
                JSON.stringify({ error: 'dealId ist erforderlich' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
        }

        const deal = await prisma.deal.findUnique({
            where: { id: dealId },
            include: {
                listing: { select: { title: true } },
                seller: { select: { id: true, email: true, name: true, firstName: true } },
                payment: true,
            },
        });

        if (!deal) {
            return new Response(JSON.stringify({ error: 'Deal nicht gefunden' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        if (deal.buyerId !== auth.userId) {
            return new Response(JSON.stringify({ error: 'Nur der Käufer kann den Erhalt bestätigen' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }

        if (!['PAID', 'SHIPPED', 'DELIVERED'].includes(deal.status)) {
            return new Response(JSON.stringify({ error: `Deal-Status ist ${deal.status} — Bestätigung nicht möglich` }), { status: 409, headers: { 'Content-Type': 'application/json' } });
        }

        // Deal als COMPLETED markieren
        await prisma.deal.update({
            where: { id: dealId },
            data: { status: 'COMPLETED', completedAt: new Date() },
        });

        const sellerPayout = calcSellerPayout(deal.totalAmount);
        const amountEuros = (sellerPayout / 100).toFixed(2);
        const sellerName = deal.seller.name || deal.seller.firstName || 'Verkäufer';

        // Verkäufer benachrichtigen
        await notifyFundsReleased({
            sellerEmail: deal.seller.email,
            sellerName,
            listingTitle: deal.listing.title,
            amountEuros,
            dealId,
        }).catch(e => console.error('[confirm email]', e));

        // Audit-Log
        await prisma.auditLog.create({
            data: {
                actorId: auth.userId,
                action: 'deal_confirmed',
                metaJson: { dealId, listingTitle: deal.listing.title },
            },
        }).catch(e => console.error('[confirm audit]', e));

        return new Response(
            JSON.stringify({ status: 'COMPLETED', dealId, sellerPayout: sellerPayout }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
    } catch (err) {
        console.error('[confirm payment]', err);
        return new Response(
            JSON.stringify({ error: 'Bestätigung fehlgeschlagen' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
        );
    }
};
