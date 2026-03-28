import type { APIRoute } from 'astro';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { getStripe, calcBuyerFee } from '../../../../lib/stripe';
import { prisma } from '../../../../lib/auth';

/**
 * POST /api/deals/:id/pay
 * Creates a Stripe Checkout Session and returns the URL to redirect the buyer.
 */
export const POST: APIRoute = async ({ request, cookies, params, clientAddress }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const deal = await prisma.deal.findUnique({
        where: { id: params.id },
        include: { listing: { select: { title: true } }, payment: true },
    });
    if (!deal) return err(404, 'Deal not found');
    if (deal.buyerId !== auth.userId) return err(403, 'Forbidden');
    if (deal.status !== 'PENDING') return err(409, `Deal status is ${deal.status}, expected PENDING`);

    const chargeAmount = deal.totalAmount + calcBuyerFee(); // Artikelpreis + 0,50 € Servicegebühr
    const appUrl = import.meta.env.APP_URL || 'http://localhost:4321';

    // Idempotency: reuse existing session/PI if already created
    if (deal.payment?.paymentIntentId) {
        // Check if we stored a checkout session ID
        const meta = deal.payment.metaJson as Record<string, unknown> | null;
        const existingSessionId = meta?.checkoutSessionId as string | undefined;
        if (existingSessionId) {
            try {
                const session = await getStripe().checkout.sessions.retrieve(existingSessionId);
                if (session.url && session.status === 'open') {
                    return json({ checkoutUrl: session.url, dealId: deal.id });
                }
            } catch { /* session expired, create new one */ }
        }
    }

    // Create Stripe Checkout Session
    const session = await getStripe().checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: deal.currency.toLowerCase(),
                product_data: {
                    name: `Ehren-Deal: ${deal.listing.title}`,
                    description: 'Treuhand-gesicherte Zahlung über Ehren-Deal',
                },
                unit_amount: chargeAmount,
            },
            quantity: 1,
        }],
        metadata: {
            dealId: deal.id,
            listingId: deal.listingId,
            buyerId: deal.buyerId,
            sellerId: deal.sellerId,
        },
        success_url: `${appUrl}/deals/${deal.id}?payment=success`,
        cancel_url: `${appUrl}/checkout/${deal.listingId}?payment=cancelled`,
    });

    // Store payment record
    if (!deal.payment) {
        await prisma.payment.create({
            data: {
                dealId: deal.id,
                provider: 'stripe',
                paymentIntentId: session.payment_intent as string | null,
                status: 'PENDING',
                amountCents: chargeAmount,
                currency: deal.currency,
                metaJson: { checkoutSessionId: session.id },
            },
        });
    } else {
        await prisma.payment.update({
            where: { id: deal.payment.id },
            data: { metaJson: { checkoutSessionId: session.id } },
        });
    }

    await prisma.deal.update({
        where: { id: deal.id },
        data: { status: 'PAYMENT_PENDING' },
    });

    await prisma.auditLog.create({
        data: { actorId: auth.userId, action: 'checkout_session_created', ip: clientAddress, metaJson: { dealId: deal.id, sessionId: session.id } },
    });

    return json({ checkoutUrl: session.url, dealId: deal.id });
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
function err(status: number, error: string) {
    return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });
}

