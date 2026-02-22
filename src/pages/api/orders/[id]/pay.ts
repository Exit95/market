import type { APIRoute } from 'astro';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { getStripe } from '../../../../lib/stripe';
import { prisma } from '../../../../lib/auth';

/**
 * POST /api/orders/:id/pay
 * Creates a Stripe PaymentIntent and returns clientSecret to buyer.
 */
export const POST: APIRoute = async ({ request, cookies, params, clientAddress }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const order = await prisma.order.findUnique({
        where: { id: params.id },
        include: { listing: { select: { title: true } } },
    });
    if (!order) return err(404, 'Order not found');
    if (order.buyerId !== auth.userId) return err(403, 'Forbidden');
    if (order.status !== 'PENDING') return err(409, `Order status is ${order.status}, expected PENDING`);

    // Idempotency: reuse existing PaymentIntent if already created
    let paymentIntentId = order.payment?.paymentIntentId ?? null;
    let clientSecret: string | null = null;

    if (paymentIntentId) {
        const pi = await getStripe().paymentIntents.retrieve(paymentIntentId);
        clientSecret = pi.client_secret;
    } else {
        const pi = await getStripe().paymentIntents.create({
            amount: order.totalAmount,
            currency: order.currency.toLowerCase(),
            description: `Novamarkt – ${order.listing.title}`,
            metadata: {
                orderId: order.id,
                listingId: order.listingId,
                buyerId: order.buyerId,
                sellerId: order.sellerId,
            },
        });
        clientSecret = pi.client_secret;
        paymentIntentId = pi.id;

        await prisma.payment.create({
            data: {
                orderId: order.id,
                provider: 'stripe',
                paymentIntentId: pi.id,
                status: 'PENDING',
                amountCents: order.totalAmount,
                currency: order.currency,
            },
        });
    }

    await prisma.auditLog.create({
        data: { actorId: auth.userId, action: 'payment_intent_created', ip: clientAddress, metaJson: { orderId: order.id, paymentIntentId } },
    });

    return json({ clientSecret, paymentIntentId, amount: order.totalAmount, currency: order.currency });
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
function err(status: number, error: string) {
    return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });
}
