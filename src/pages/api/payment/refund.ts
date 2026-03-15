import type { APIRoute } from 'astro';
import { refundPayIn } from '../../../lib/mangopay';
import { sendEmail } from '../../../lib/mailer';

/**
 * POST /api/payment/refund
 * Erstattet eine Zahlung an den Käufer zurück (z.B. bei Problem mit der Ware).
 *
 * Body:
 * {
 *   payInId: string,     // Mangopay-ID des ursprünglichen PayIn
 *   authorId: string,    // Mangopay-ID des Käufers
 *   buyerEmail?: string,
 *   buyerName?: string,
 *   reason?: string,
 * }
 */
export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { payInId, authorId, buyerEmail, buyerName, reason } = body as {
            payInId: string;
            authorId: string;
            buyerEmail?: string;
            buyerName?: string;
            reason?: string;
        };

        if (!payInId || !authorId) {
            return new Response(
                JSON.stringify({ error: 'payInId und authorId sind erforderlich' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
        }

        const refund = await refundPayIn(payInId, authorId);

        // Benachrichtigungs-E-Mail an Käufer
        if (buyerEmail && buyerName) {
            await sendEmail({
                to: buyerEmail,
                subject: '↩️ Ihre Rückerstattung wurde eingeleitet',
                html: `
                    <p>Hallo ${buyerName},</p>
                    <p>Ihre Rückerstattung wurde erfolgreich eingeleitet.</p>
                    ${reason ? `<p><strong>Grund:</strong> ${reason}</p>` : ''}
                    <p>Das Geld wird in 2–5 Werktagen auf Ihrem Konto gutgeschrieben.</p>
                    <p>Ihr Novamarkt-Team</p>
                `.trim(),
            }).catch((e) => console.error('[refund email]', e));
        }

        return new Response(
            JSON.stringify({
                refundId: refund.Id,
                status: refund.Status,
                payInId,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
    } catch (err) {
        console.error('[refund]', err);
        return new Response(
            JSON.stringify({ error: 'Rückerstattung fehlgeschlagen' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
        );
    }
};
