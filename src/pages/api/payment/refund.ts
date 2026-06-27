import type { APIRoute } from 'astro';
import { getStripe } from '../../../lib/stripe';
import { prisma } from '../../../lib/auth';
import { requireAuth, isAuthContext } from '../../../lib/auth-middleware';
import { sendMail } from '../../../lib/mailer';

/**
 * POST /api/payment/refund
 * Erstellt eine Stripe-Rückerstattung für eine Zahlung.
 *
 * Body: { dealId: string, reason?: string }
 */
export const POST: APIRoute = async ({ request, cookies }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    try {
        const body = await request.json();
        const { dealId, reason } = body as { dealId: string; reason?: string };

        if (!dealId) {
            return new Response(
                JSON.stringify({ error: 'dealId ist erforderlich' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
        }

        const deal = await prisma.deal.findUnique({
            where: { id: dealId },
            include: {
                payment: true,
                buyer: { select: { id: true, email: true, name: true, firstName: true } },
                listing: { select: { title: true } },
            },
        });

        if (!deal) {
            return new Response(JSON.stringify({ error: 'Deal nicht gefunden' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        // Nur der Käufer oder ein Admin darf eine Rückerstattung anfordern
        if (deal.buyerId !== auth.userId && auth.role !== 'ADMIN') {
            return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }

        if (!deal.payment?.paymentIntentId) {
            return new Response(JSON.stringify({ error: 'Keine Zahlung gefunden' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        // Stripe Refund erstellen
        const refund = await getStripe().refunds.create({
            payment_intent: deal.payment.paymentIntentId,
            reason: 'requested_by_customer',
            metadata: { dealId, reason: reason || '' },
        });

        // DB aktualisieren
        await prisma.$transaction([
            prisma.payment.update({
                where: { id: deal.payment.id },
                data: {
                    status: 'REFUNDED',
                    refundedCents: deal.payment.amountCents,
                    metaJson: { ...((deal.payment.metaJson as Record<string, unknown>) || {}), refundId: refund.id },
                },
            }),
            prisma.deal.update({
                where: { id: dealId },
                data: { status: 'REFUNDED' },
            }),
        ]);

        // Käufer benachrichtigen
        const buyerName = deal.buyer.name || deal.buyer.firstName || 'Käufer';
        await sendMail({
            to: deal.buyer.email,
            subject: `Rückerstattung eingeleitet — ${deal.listing.title}`,
            html: `
            <div style="font-family:'Inter',system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;background:#F8FAFB;padding:0">
                <div style="background:#1A2332;padding:24px 32px;text-align:center">
                    <span style="color:#FFFFFF;font-size:20px;font-weight:600;letter-spacing:-0.02em">Ehren-Deal</span>
                </div>
                <div style="background:#FFFFFF;padding:32px;border:1px solid #E5E7EB;border-top:none">
                    <h2 style="color:#1A2332;font-size:20px;margin:0 0 12px">Rückerstattung eingeleitet</h2>
                    <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 16px">
                        Hallo ${buyerName}, deine Rückerstattung für <strong style="color:#1A2332">${deal.listing.title}</strong> wurde erfolgreich eingeleitet.
                    </p>
                    ${reason ? `<div style="background:#E3F2FD;border-left:3px solid #1B65A6;padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0"><p style="color:#1A2332;font-size:13px;margin:0"><strong>Grund:</strong> ${reason}</p></div>` : ''}
                    <p style="color:#64748B;font-size:14px;line-height:1.6">
                        Das Geld wird in 5–10 Werktagen auf deinem Konto gutgeschrieben.
                    </p>
                </div>
                <div style="padding:16px 32px;text-align:center">
                    <p style="color:#6B7280;font-size:12px;margin:0">Ehren-Deal — Sicher handeln mit Vertrauen</p>
                </div>
            </div>`,
        }).catch(e => console.error('[refund email]', e));

        // Audit-Log
        await prisma.auditLog.create({
            data: {
                actorId: auth.userId,
                action: 'refund_created',
                metaJson: { dealId, refundId: refund.id, reason },
            },
        }).catch(e => console.error('[refund audit]', e));

        return new Response(
            JSON.stringify({ refundId: refund.id, status: refund.status, dealId }),
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
