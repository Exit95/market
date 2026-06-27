import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/auth';
import { getIdentStatus, validateWebhookPayload } from '../../../lib/idnow';
import { sendMail } from '../../../lib/mailer';

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
        const hmacHeader = request.headers.get('X-HMAC-SHA256');

        if (!validateWebhookPayload(payload, hmacHeader)) {
            return new Response(JSON.stringify({ error: 'Ungültige Webhook-Payload' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const { transactionNumber } = payload as {
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

        // User über kycIdentId finden
        const user = await prisma.user.findFirst({
            where: { kycIdentId: transactionNumber },
        });

        if (!user) {
            console.warn(`[KYC webhook] Kein User für identId ${transactionNumber} gefunden`);
            return new Response(JSON.stringify({ received: true, status: 'user_not_found' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // DB-Update: KYC-Status des Nutzers setzen
        if (identStatus.status === 'SUCCESS') {
            await prisma.user.update({
                where: { id: user.id },
                data: { idVerified: true },
            });

            // Trust-Score aktualisieren (KYC = großer Sprung)
            await prisma.trustScore.upsert({
                where: { userId: user.id },
                update: {
                    score: { increment: 20 },
                    level: 'VERIFIED',
                },
                create: {
                    userId: user.id,
                    score: 50,
                    level: 'VERIFIED',
                },
            }).catch(e => console.error('[KYC webhook] TrustScore-Update:', e));

            // Bestätigungs-E-Mail senden
            await sendMail({
                to: user.email,
                subject: 'Identität verifiziert — Ehren-Deal',
                html: `
                <div style="font-family:'Inter',system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;background:#F8FAFB;padding:0">
                    <div style="background:#1A2332;padding:24px 32px;text-align:center">
                        <span style="color:#FFFFFF;font-size:20px;font-weight:600;letter-spacing:-0.02em">Ehren-Deal</span>
                    </div>
                    <div style="background:#FFFFFF;padding:32px;border:1px solid #E5E7EB;border-top:none">
                        <h2 style="color:#1A2332;font-size:20px;margin:0 0 12px">Identität verifiziert</h2>
                        <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 16px">
                            Hallo ${user.firstName || 'Nutzer'}, deine Identität wurde erfolgreich verifiziert.
                        </p>
                        <div style="background:#E8F5E9;border-left:3px solid #22A06B;padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0">
                            <p style="color:#1A2332;font-size:13px;margin:0">Dein Trust-Level wurde auf <strong>VERIFIED</strong> angehoben. Du kannst jetzt in allen Kategorien handeln.</p>
                        </div>
                        <a href="https://ehren-deal.de/profil" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#1B65A6;color:#FFFFFF;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Zum Profil</a>
                    </div>
                    <div style="padding:16px 32px;text-align:center">
                        <p style="color:#94A3B8;font-size:12px;margin:0">Ehren-Deal — Sicher handeln mit Vertrauen</p>
                    </div>
                </div>`,
            }).catch(e => console.error('[KYC webhook email]', e));

            // Audit-Log
            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'kyc_verified',
                    details: `IDnow Verifizierung erfolgreich: ${transactionNumber}`,
                },
            }).catch(e => console.error('[KYC webhook audit]', e));

        } else if (identStatus.status === 'FAILED' || identStatus.status === 'ABORTED') {
            // Audit-Log für fehlgeschlagene Verifizierung
            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'kyc_failed',
                    details: `IDnow Verifizierung ${identStatus.status}: ${transactionNumber}`,
                },
            }).catch(e => console.error('[KYC webhook audit]', e));
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
