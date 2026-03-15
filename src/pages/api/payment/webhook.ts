import type { APIRoute } from 'astro';
import { sendEmail } from '../../../lib/mailer';

/**
 * POST /api/payment/webhook
 * Mangopay Webhook-Endpunkt — verarbeitet Zahlungsstatus-Updates.
 *
 * Mangopay sendet Event-Notifications z.B.:
 * EventType: PAYIN_NORMAL_SUCCEEDED | TRANSFER_NORMAL_SUCCEEDED | PAYOUT_NORMAL_SUCCEEDED | PAYIN_NORMAL_FAILED
 *
 * Docs: https://docs.mangopay.com/webhooks/event-types
 */
export const POST: APIRoute = async ({ request }) => {
    try {
        // Mangopay sendet Webhook als Query-Parameter (GET-ähnlich)
        const url = new URL(request.url);
        const eventType = url.searchParams.get('EventType');
        const resourceId = url.searchParams.get('RessourceId') ?? url.searchParams.get('ResourceId');
        const date = url.searchParams.get('Date');

        console.log('[Mangopay webhook]', { eventType, resourceId, date });

        if (!eventType || !resourceId) {
            return new Response(JSON.stringify({ error: 'Mangopay Event-Daten fehlen' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        switch (eventType) {
            case 'PAYIN_NORMAL_SUCCEEDED':
                // TODO: DB aktualisieren (Bestellung als "bezahlt" markieren)
                console.log(`[webhook] PayIn erfolgreich: ${resourceId}`);
                break;

            case 'PAYIN_NORMAL_FAILED':
                // TODO: Käufer informieren und Bestellung stornieren
                console.log(`[webhook] PayIn fehlgeschlagen: ${resourceId}`);
                break;

            case 'TRANSFER_NORMAL_SUCCEEDED':
                // TODO: Verkäufer informieren (Geld freigegeben)
                console.log(`[webhook] Transfer erfolgreich: ${resourceId}`);
                break;

            case 'PAYOUT_NORMAL_SUCCEEDED':
                // TODO: Auszahlung erfolgreich
                console.log(`[webhook] Payout erfolgreich: ${resourceId}`);
                break;

            case 'PAYOUT_NORMAL_FAILED':
                // TODO: Admin benachrichtigen
                console.log(`[webhook] Payout fehlgeschlagen: ${resourceId}`);
                await sendEmail({
                    to: import.meta.env.SMTP_FROM || 'admin@novamarkt.de',
                    subject: `⚠️ Mangopay Payout fehlgeschlagen: ${resourceId}`,
                    html: `<p>Payout ${resourceId} ist fehlgeschlagen. Bitte im Mangopay Dashboard prüfen.</p>`,
                }).catch(console.error);
                break;

            default:
                console.log(`[webhook] Unbekannter EventType: ${eventType}`);
        }

        // Mangopay erwartet HTTP 200, sonst wird der Webhook erneut gesendet
        return new Response(JSON.stringify({ received: true, eventType }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        console.error('[payment webhook]', err);
        // Auch bei Fehler 200 zurückgeben, damit Mangopay nicht endlos retried
        return new Response(JSON.stringify({ received: false }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
