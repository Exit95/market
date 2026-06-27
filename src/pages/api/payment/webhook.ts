import type { APIRoute } from 'astro';

/**
 * POST /api/payment/webhook
 * DEPRECATED — Mangopay wurde entfernt. Stripe-Webhooks gehen über /api/stripe/webhook.
 * Diese Route bleibt als Redirect für eventuell noch konfigurierte Mangopay-Webhooks.
 */
export const POST: APIRoute = async () => {
    console.warn('[payment/webhook] Deprecated Mangopay webhook called — use /api/stripe/webhook');
    return new Response(JSON.stringify({ error: 'Use /api/stripe/webhook' }), {
        status: 410,
        headers: { 'Content-Type': 'application/json' },
    });
};
