import type { APIRoute } from 'astro';
import { randomInt } from 'crypto';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { sendMail } from '../../../../lib/mailer';
import { prisma } from '../../../../lib/auth';
import { checkRateLimit, rateLimitResponse } from '../../../../lib/rate-limit';

/**
 * POST /api/verify/phone/send
 * Generates a 6-digit OTP, stores it, and sends it via SMS (or email fallback).
 * Body: { phone?: string } – optional, to set/update the phone number
 */
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    // Rate limit: max 5 OTP sends per hour
    if (!checkRateLimit(`phone_otp:${auth.userId}`, 5, 60 * 60 * 1000)) {
        return rateLimitResponse(60 * 60);
    }

    const body = await request.json().catch(() => ({})) as { phone?: string };

    const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { phone: true, phoneVerified: true, email: true, firstName: true },
    });
    if (!user) return err(404, 'User nicht gefunden');
    if (user.phoneVerified) return json({ ok: true, message: 'Handynummer bereits verifiziert' });

    // Update phone if provided and different
    let phone = user.phone;
    if (body.phone && body.phone.trim().length >= 6) {
        phone = body.phone.trim();
        await prisma.user.update({ where: { id: auth.userId }, data: { phone } });
    }

    if (!phone) return err(400, 'Keine Handynummer hinterlegt. Bitte zuerst eine Nummer angeben.');

    // Generate 6-digit OTP
    const code = String(randomInt(100000, 999999));
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.verification.upsert({
        where: { id: `phone-${auth.userId}` },
        update: { status: 'PENDING', metaJson: { code, phone }, expiresAt: expires },
        create: { id: `phone-${auth.userId}`, userId: auth.userId, type: 'PHONE', status: 'PENDING', metaJson: { code, phone }, expiresAt: expires },
    });

    // TODO: Replace with real SMS provider (e.g. Twilio Verify)
    // For now: send code via email as fallback
    const name = user.firstName || 'Nutzer';
    try {
        await sendMail({
            to: user.email,
            subject: 'Ehren-Deal – Dein Verifizierungscode',
            html: `
                <div style="font-family:'Inter',system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;background:#F8FAFB;padding:0">
                    <div style="background:#1A2332;padding:24px 32px;text-align:center">
                        <span style="color:#FFFFFF;font-size:20px;font-weight:600;letter-spacing:-0.02em">Ehren-Deal</span>
                    </div>
                    <div style="background:#FFFFFF;padding:32px;border:1px solid #E5E7EB;border-top:none">
                        <h2 style="color:#1A2332;font-size:20px;margin:0 0 12px">Handynummer verifizieren</h2>
                        <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 20px">Hallo ${name}, dein Verifizierungscode lautet:</p>
                        <div style="margin:16px 0;padding:16px;background:#E3F2FD;text-align:center;border-radius:8px">
                            <span style="font-size:2rem;font-weight:700;color:#1B65A6;letter-spacing:.3em">${code}</span>
                        </div>
                        <p style="color:#94A3B8;font-size:13px;line-height:1.5">Der Code ist <strong style="color:#1A2332">10 Minuten</strong> gültig.</p>
                    </div>
                    <div style="padding:16px 32px;text-align:center">
                        <p style="color:#94A3B8;font-size:12px;margin:0">Ehren-Deal — Sicher handeln mit Vertrauen</p>
                    </div>
                </div>`,
        });
    } catch (e) {
        console.error('[phone/send] Failed to send OTP email:', e);
        return err(500, 'Code konnte nicht gesendet werden');
    }

    console.log(`[phone/send] OTP for ${auth.userId}: ${code}`);
    return json({ ok: true, message: 'Code gesendet' });
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function err(status: number, message: string) {
    return new Response(JSON.stringify({ error: message }), { status, headers: { 'Content-Type': 'application/json' } });
}

