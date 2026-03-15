import type { APIRoute } from 'astro';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { getStripe } from '../../../../lib/stripe';
import { prisma } from '../../../../lib/auth';

/**
 * POST /api/deals/:id/pay
 * Creates a Stripe PaymentIntent and returns clientSecret to buyer.
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

    // Idempotency: reuse existing PaymentIntent if already created
    let paymentIntentId = deal.payment?.paymentIntentId ?? null;
    let clientSecret: string | null = null;

    if (paymentIntentId) {
        const pi = await getStripe().paymentIntents.retrieve(paymentIntentId);
        clientSecret = pi.client_secret;
    } else {
        const pi = await getStripe().paymentIntents.create({
            amount: deal.totalAmount,
            currency: deal.currency.toLowerCase(),
            description: `Ehren-Deal – ${deal.listing.title}`,
            metadata: {
                dealId: deal.id,
                listingId: deal.listingId,
                buyerId: deal.buyerId,
                sellerId: deal.sellerId,
            },
        });
        clientSecret = pi.client_secret;
        paymentIntentId = pi.id;

        await prisma.payment.create({
            data: {
                dealId: deal.id,
                provider: 'stripe',
                paymentIntentId: pi.id,
                status: 'PENDING',
                amountCents: deal.totalAmount,
                currency: deal.currency,
            },
        });
    }

    await prisma.auditLog.create({
        data: { actorId: auth.userId, action: 'payment_intent_created', ip: clientAddress, metaJson: { dealId: deal.id, paymentIntentId } },
    });

    return json({ clientSecret, paymentIntentId, amount: deal.totalAmount, currency: deal.currency });
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
function err(status: number, error: string) {
    return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });
}

