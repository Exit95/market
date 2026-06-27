import type { APIRoute } from 'astro';
import { getStripe } from '../../../lib/stripe';
import { prisma } from '../../../lib/auth';
import {
    notifyPaymentSucceeded,
    notifyPaymentFailed,
    notifySellerPaymentReceived,
} from '../../../lib/notifications';

/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events (checkout.session.completed, payment_intent.succeeded, etc.)
 * Verify signature using STRIPE_WEBHOOK_SECRET env var.
 */
export const POST: APIRoute = async ({ request }) => {
    const sig = request.headers.get('stripe-signature') ?? '';
    const secret = process.env.STRIPE_WEBHOOK_SECRET || import.meta.env.STRIPE_WEBHOOK_SECRET;
    const raw = await request.arrayBuffer();

    let event: ReturnType<typeof getStripe>['webhooks']['constructEvent'] extends (...a: any) => infer R ? R : never;
    try {
        event = getStripe().webhooks.constructEvent(Buffer.from(raw), sig, secret);
    } catch (e: any) {
        console.error('Webhook signature invalid:', e.message);
        return new Response(JSON.stringify({ error: e.message }), { status: 400 });
    }

    console.log(`[stripe webhook] ${event.type}`);

    // ── Checkout Session Completed ──
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as {
            id: string;
            payment_intent: string | null;
            metadata: { dealId?: string };
            amount_total?: number;
        };
        const dealId = session.metadata?.dealId;
        if (!dealId) return ok();

        const deal = await prisma.deal.findUnique({
            where: { id: dealId },
            include: {
                buyer: { select: { email: true, name: true, firstName: true } },
                seller: { select: { email: true, name: true, firstName: true } },
                listing: { select: { title: true } },
                payment: true,
            },
        });

        if (!deal) return ok();

        // DB: Payment + Deal Status aktualisieren
        await prisma.$transaction([
            prisma.payment.updateMany({
                where: { dealId },
                data: { status: 'SUCCEEDED', paymentIntentId: session.payment_intent },
            }),
            prisma.deal.updateMany({
                where: { id: dealId, status: { in: ['PENDING', 'PAYMENT_PENDING'] } },
                data: { status: 'PAID' },
            }),
        ]);

        const amountEuros = (deal.totalAmount / 100).toFixed(2);
        const buyerName = deal.buyer.name || deal.buyer.firstName || 'Käufer';
        const sellerName = deal.seller.name || deal.seller.firstName || 'Verkäufer';

        // E-Mail an Käufer
        await notifyPaymentSucceeded({
            buyerEmail: deal.buyer.email,
            buyerName,
            listingTitle: deal.listing.title,
            amountEuros,
            dealId,
        }).catch(e => console.error('[stripe webhook] buyer email:', e));

        // E-Mail an Verkäufer
        await notifySellerPaymentReceived({
            sellerEmail: deal.seller.email,
            sellerName,
            listingTitle: deal.listing.title,
            amountEuros,
            dealId,
        }).catch(e => console.error('[stripe webhook] seller email:', e));

        // Audit-Log
        await prisma.auditLog.create({
            data: {
                actorId: deal.buyerId,
                action: 'payment_succeeded',
                metaJson: { dealId, sessionId: session.id, paymentIntentId: session.payment_intent },
            },
        }).catch(e => console.error('[stripe webhook] audit:', e));
    }

    // ── Payment Intent Succeeded (Fallback) ──
    if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object as { id: string; metadata: { dealId?: string; orderId?: string } };
        const dealId = pi.metadata?.dealId ?? pi.metadata?.orderId;
        if (!dealId) return ok();

        await prisma.$transaction([
            prisma.payment.updateMany({
                where: { paymentIntentId: pi.id },
                data: { status: 'SUCCEEDED' },
            }),
            prisma.deal.updateMany({
                where: { id: dealId, status: { in: ['PENDING', 'PAYMENT_PENDING'] } },
                data: { status: 'PAID' },
            }),
        ]);
    }

    // ── Payment Failed ──
    if (event.type === 'payment_intent.payment_failed') {
        const pi = event.data.object as { id: string; metadata: { dealId?: string } };

        await prisma.payment.updateMany({
            where: { paymentIntentId: pi.id },
            data: { status: 'FAILED' },
        });

        // Notify buyer
        if (pi.metadata?.dealId) {
            const deal = await prisma.deal.findUnique({
                where: { id: pi.metadata.dealId },
                include: {
                    buyer: { select: { email: true, name: true, firstName: true } },
                    listing: { select: { title: true } },
                },
            });

            if (deal) {
                await prisma.deal.update({
                    where: { id: deal.id },
                    data: { status: 'PAYMENT_PENDING' },
                });

                await notifyPaymentFailed({
                    buyerEmail: deal.buyer.email,
                    buyerName: deal.buyer.name || deal.buyer.firstName || 'Käufer',
                    listingTitle: deal.listing.title,
                    dealId: deal.id,
                }).catch(e => console.error('[stripe webhook] failed email:', e));
            }
        }
    }

    // ── Charge Refunded ──
    if (event.type === 'charge.refunded') {
        const charge = event.data.object as { payment_intent: string; amount_refunded: number };
        if (charge.payment_intent) {
            await prisma.payment.updateMany({
                where: { paymentIntentId: charge.payment_intent as string },
                data: { status: 'REFUNDED', refundedCents: charge.amount_refunded },
            });
        }
    }

    return ok();
};

function ok() {
    return new Response('ok', { status: 200 });
}
