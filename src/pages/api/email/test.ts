import type { APIRoute } from 'astro';
import { sendMail } from '../../../lib/mailer';

/**
 * POST /api/email/test
 * Sendet eine Test-E-Mail — NUR in der Entwicklungsumgebung verfügbar.
 *
 * Body: { to: string, subject?: string }
 */
export const POST: APIRoute = async ({ request }) => {
    // Nur in Entwicklung erlauben
    if (import.meta.env.MODE === 'production') {
        return new Response(
            JSON.stringify({ error: 'Nur im Entwicklungsmodus verfügbar' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } },
        );
    }

    try {
        const body = await request.json();
        const { to, subject } = body as { to?: string; subject?: string };

        if (!to) {
            return new Response(
                JSON.stringify({ error: 'Empfänger-E-Mail (to) ist erforderlich' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
        }

        await sendMail({
            to,
            subject: subject || '🔧 Novamarkt – Test-E-Mail',
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                    <h1 style="color: #06b6d4;">Novamarkt Test-E-Mail ✅</h1>
                    <p>Dies ist eine Test-Nachricht der Novamarkt-Plattform.</p>
                    <hr style="border: 1px solid #e5e7eb; margin: 24px 0;" />
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Gesendet an:</td>
                            <td style="padding: 8px 0; font-size: 14px;">${to}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Zeitstempel:</td>
                            <td style="padding: 8px 0; font-size: 14px;">${new Date().toLocaleString('de-DE')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">SMTP-Host:</td>
                            <td style="padding: 8px 0; font-size: 14px;">${import.meta.env.SMTP_HOST || '(nicht konfiguriert)'}</td>
                        </tr>
                    </table>
                    <p style="margin-top: 32px; color: #6b7280; font-size: 12px;">
                        Diese E-Mail wurde automatisch generiert. Bitte nicht antworten.
                    </p>
                </div>
            `.trim(),
        });

        return new Response(
            JSON.stringify({ success: true, to, sentAt: new Date().toISOString() }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
    } catch (err) {
        console.error('[email test]', err);
        const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
        return new Response(
            JSON.stringify({ error: `E-Mail konnte nicht gesendet werden: ${message}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
        );
    }
};
