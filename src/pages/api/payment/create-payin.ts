import type { APIRoute } from 'astro';

/**
 * POST /api/payment/create-payin
 * DEPRECATED — Mangopay wurde entfernt. Nutze /api/deals/:id/pay für Stripe Checkout.
 */
export const POST: APIRoute = async () => {
    return new Response(JSON.stringify({ error: 'Deprecated. Use POST /api/deals/:id/pay for Stripe Checkout.' }), {
        status: 410,
        headers: { 'Content-Type': 'application/json' },
    });
};
