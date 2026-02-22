import type { APIRoute } from 'astro';
import {
    createCardPayIn,
    calculateFee,
    eurosToCents,
} from '../../../lib/mangopay';
import { paymentReceivedEmail } from '../../../lib/mailer';

/**
 * POST /api/payment/create-payin
 * Initiiert eine sichere Escrow-Zahlung über Mangopay.
 *
 * Body:
 * {
 *   buyerMangopayId: string,
 *   walletId: string,
 *   amountEuros: number,      // Kaufpreis in Euro (z.B. 949.00)
 *   listingTitle: string,
 *   returnUrl: string,        // wohin Mangopay nach 3DS redirectet
 *   buyerEmail?: string,
 *   buyerName?: string,
 * }
 */
export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const {
            buyerMangopayId,
            walletId,
            amountEuros,
            listingTitle,
            returnUrl,
            buyerEmail,
            buyerName,
        } = body as {
            buyerMangopayId: string;
            walletId: string;
            amountEuros: number;
            listingTitle: string;
            returnUrl: string;
            buyerEmail?: string;
            buyerName?: string;
        };

        if (!buyerMangopayId || !walletId || !amountEuros || !listingTitle || !returnUrl) {
            return new Response(
                JSON.stringify({ error: 'Pflichtfelder fehlen' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
        }

        const amountCents = eurosToCents(amountEuros);
        const feeCents = calculateFee(amountCents);

        const payIn = await createCardPayIn({
            buyerMangopayId,
            walletId,
            amountCents,
            feeCents,
            returnUrl,
            listingTitle,
        });

        // Bestätigungs-E-Mail an Käufer senden
        if (buyerEmail && buyerName) {
            // paymentReceivedEmail(to, buyerName, listingTitle, amountEur)
            await paymentReceivedEmail(
                buyerEmail,
                buyerName,
                listingTitle,
                amountEuros,
            ).catch((e) => console.error('[create-payin email]', e));
        }

        return new Response(
            JSON.stringify({
                payInId: payIn.Id,
                redirectUrl: (payIn as unknown as { RedirectURL: string }).RedirectURL,
                status: payIn.Status,
                amountCents,
                feeCents,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
    } catch (err) {
        console.error('[create-payin]', err);
        return new Response(
            JSON.stringify({ error: 'Zahlung konnte nicht erstellt werden' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
        );
    }
};
