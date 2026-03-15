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
                <div style="font-family:'Barlow',sans-serif;max-width:560px;margin:0 auto;background:#0a0a0b;padding:2rem;border:1px solid rgba(200,151,58,0.2)">
                    <h2 style="color:#c8973a;font-family:'Cormorant Garamond',serif;font-weight:300;margin-bottom:1rem">Handynummer verifizieren</h2>
                    <p style="color:#e8e4de;font-size:.9rem;line-height:1.6">Hallo ${name}, dein Verifizierungscode lautet:</p>
                    <div style="margin:1.5rem 0;padding:1rem;background:#c8973a22;text-align:center;">
                        <span style="font-size:2rem;font-weight:700;color:#c8973a;letter-spacing:.3em">${code}</span>
                    </div>
                    <p style="color:#e8e4de99;font-size:.8rem;line-height:1.5">Der Code ist <strong style="color:#c8973a">10 Minuten</strong> gültig.</p>
                    <hr style="border:none;height:1px;background:linear-gradient(90deg,transparent,#c8973a40,transparent);margin:1.5rem 0"/>
                    <p style="color:#e8e4de50;font-size:.7rem;text-align:center">Ehren-Deal – Sicher handeln mit Ehre</p>
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

