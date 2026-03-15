import type { APIRoute } from 'astro';
import { createTransfer, calculateFee } from '../../../lib/mangopay';
import { releasePaymentEmail } from '../../../lib/mailer';

/**
 * POST /api/payment/confirm
 * Käufer bestätigt Warenerhalt → Geld wird vom Escrow-Wallet zum Verkäufer-Wallet transferiert.
 *
 * Body:
 * {
 *   authorId: string,          // Mangopay-ID des Käufers
 *   escrowWalletId: string,    // Platform-Escrow-Wallet
 *   sellerWalletId: string,    // Ziel-Wallet des Verkäufers
 *   amountCents: number,
 *   sellerEmail?: string,
 *   sellerName?: string,
 *   amountEuros?: number,      // für E-Mail
 * }
 */
export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const {
            authorId,
            escrowWalletId,
            sellerWalletId,
            amountCents,
            sellerEmail,
            sellerName,
            amountEuros,
        } = body as {
            authorId: string;
            escrowWalletId: string;
            sellerWalletId: string;
            amountCents: number;
            sellerEmail?: string;
            sellerName?: string;
            amountEuros?: number;
        };

        if (!authorId || !escrowWalletId || !sellerWalletId || !amountCents) {
            return new Response(
                JSON.stringify({ error: 'Pflichtfelder fehlen' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
        }

        const feeCents = calculateFee(amountCents);
        const netAmountCents = amountCents - feeCents;

        const transfer = await createTransfer({
            authorId,
            debitedWalletId: escrowWalletId,
            creditedWalletId: sellerWalletId,
            amountCents: netAmountCents,
            feeCents,
            tag: 'Novamarkt escrow release',
        });

        // E-Mail an Verkäufer
        if (sellerEmail && sellerName) {
            // releasePaymentEmail(to, sellerName, listingTitle, amountEur)
            await releasePaymentEmail(
                sellerEmail,
                sellerName,
                'Ihr Artikel', // TODO: listingTitle aus DB
                amountEuros ?? netAmountCents / 100,
            ).catch((e) => console.error('[confirm email]', e));
        }

        return new Response(
            JSON.stringify({
                transferId: transfer.Id,
                status: transfer.Status,
                netAmountCents,
                feeCents,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
    } catch (err) {
        console.error('[confirm payment]', err);
        return new Response(
            JSON.stringify({ error: 'Zahlung konnte nicht freigegeben werden' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
        );
    }
};
