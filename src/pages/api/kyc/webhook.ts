import type { APIRoute } from 'astro';
import { getIdentStatus, validateWebhookPayload } from '../../../lib/idnow';
import { kycSuccessEmail } from '../../../lib/mailer';

/**
 * POST /api/kyc/webhook
 * IDnow Webhook-Endpunkt — wird von IDnow aufgerufen, wenn sich der
 * Verifikationsstatus ändert.
 *
 * IDnow sendet:
 * {
 *   "transactionNumber": "COMPANYID-userid-timestamp",
 *   "result": "SUCCESS" | "FAILED" | ...
 * }
 */
export const POST: APIRoute = async ({ request }) => {
    try {
        const payload = await request.json();

        if (!validateWebhookPayload(payload)) {
            return new Response(JSON.stringify({ error: 'Ungültige Webhook-Payload' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const { transactionNumber, result } = payload as {
            transactionNumber?: string;
            result?: string;
        };

        if (!transactionNumber) {
            return new Response(
                JSON.stringify({ error: 'transactionNumber fehlt' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
        }

        // Aktuellen Status von IDnow abrufen
        const identStatus = await getIdentStatus(transactionNumber);
        console.log('[KYC webhook] identId:', transactionNumber, 'status:', identStatus.status);

        // TODO: Datenbank-Update (KYC-Status des Nutzers setzen)
        // await db.users.update({ kyc_status: identStatus.status }, { where: { kyc_ident_id: transactionNumber } });

        // Bei Erfolg: Bestätigungs-E-Mail senden
        if (identStatus.status === 'SUCCESS') {
            const userEmail = extractEmailFromIdentId(transactionNumber);
            if (userEmail) {
                // kycSuccessEmail(to, name) sendet die E-Mail direkt
                await kycSuccessEmail(
                    userEmail,
                    identStatus.firstName || 'Nutzer',
                ).catch((e) => console.error('[KYC webhook email]', e));
            }
        }

        return new Response(JSON.stringify({ received: true, status: identStatus.status }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        console.error('[KYC webhook]', err);
        return new Response(
            JSON.stringify({ error: 'Webhook-Verarbeitung fehlgeschlagen' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
        );
    }
};

/**
 * Hilfsfunktion: Extrahiert eine E-Mail-Adresse aus der ident ID.
 * In der Praxis würde man das aus der Datenbank holen.
 */
function extractEmailFromIdentId(_identId: string): string | null {
    // TODO: DB-Lookup für userId → email
    return null;
}
