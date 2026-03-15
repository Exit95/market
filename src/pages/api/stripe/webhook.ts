import type { APIRoute } from 'astro';
import { getStripe } from '../../../lib/stripe';
import { prisma } from '../../../lib/auth';

/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events (payment_intent.succeeded, etc.)
 * Verify signature using STRIPE_WEBHOOK_SECRET env var.
 */
export const POST: APIRoute = async ({ request }) => {
    const sig = request.headers.get('stripe-signature') ?? '';
    const secret = import.meta.env.STRIPE_WEBHOOK_SECRET;
    const raw = await request.arrayBuffer();

    let event: ReturnType<typeof getStripe>['webhooks']['constructEvent'] extends (...a: any) => infer R ? R : never;
    try {
        event = getStripe().webhooks.constructEvent(Buffer.from(raw), sig, secret);
    } catch (e: any) {
        console.error('Webhook signature invalid:', e.message);
        return new Response(JSON.stringify({ error: e.message }), { status: 400 });
    }

    // Handle Stripe Checkout Session completion
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as {
            id: string;
            payment_intent: string | null;
            metadata: { dealId?: string };
        };
        const dealId = session.metadata?.dealId;
        if (!dealId) return new Response('ok', { status: 200 });

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

        await prisma.auditLog.create({
            data: {
                action: 'payment_succeeded',
                metaJson: { dealId, sessionId: session.id, paymentIntentId: session.payment_intent },
            },
        });
    }

    if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object as { id: string; metadata: { dealId?: string; orderId?: string } };
        const dealId = pi.metadata?.dealId ?? pi.metadata?.orderId;
        if (!dealId) return new Response('ok', { status: 200 });

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

        await prisma.auditLog.create({
            data: {
                action: 'payment_succeeded',
                metaJson: { dealId, paymentIntentId: pi.id },
            },
        });
    }

    if (event.type === 'payment_intent.payment_failed') {
        const pi = event.data.object as { id: string };
        await prisma.payment.updateMany({
            where: { paymentIntentId: pi.id },
            data: { status: 'FAILED' },
        });
    }

    return new Response('ok', { status: 200 });
};

// Disable body parsing – Stripe needs raw bytes for signature validation
export const config = { api: { bodyParser: false } };
