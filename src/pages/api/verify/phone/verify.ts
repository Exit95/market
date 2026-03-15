import type { APIRoute } from 'astro';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { refreshTrustScore } from '../../../../lib/trust-score';
import { prisma } from '../../../../lib/auth';
import { checkRateLimit, rateLimitResponse } from '../../../../lib/rate-limit';

/**
 * POST /api/verify/phone/verify
 * Validates the 6-digit OTP code.
 * Body: { code: string }
 */
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    // Rate limit: max 10 verification attempts per hour
    if (!checkRateLimit(`phone_verify:${auth.userId}`, 10, 60 * 60 * 1000)) {
        return rateLimitResponse(60 * 60);
    }

    const body = await request.json().catch(() => ({})) as { code?: string };
    const code = body.code?.trim();
    if (!code || code.length !== 6) return err(400, 'Bitte 6-stelligen Code eingeben');

    const v = await prisma.verification.findUnique({ where: { id: `phone-${auth.userId}` } });
    if (!v || v.status !== 'PENDING') return err(400, 'Kein ausstehender Code. Bitte erneut anfordern.');
    if (v.expiresAt && v.expiresAt < new Date()) {
        await prisma.verification.update({ where: { id: v.id }, data: { status: 'EXPIRED' } });
        return err(400, 'Code abgelaufen. Bitte neuen Code anfordern.');
    }

    const meta = v.metaJson as { code?: string; phone?: string };
    if (meta?.code !== code) {
        return err(400, 'Ungültiger Code');
    }

    // Success: mark phone as verified
    await prisma.$transaction([
        prisma.user.update({ where: { id: auth.userId }, data: { phoneVerified: true } }),
        prisma.verification.update({ where: { id: v.id }, data: { status: 'SUCCESS' } }),
    ]);

    await prisma.auditLog.create({
        data: {
            actorId: auth.userId,
            action: 'phone_verified',
            ip: clientAddress,
            metaJson: { phone: meta?.phone },
        },
    });

    await refreshTrustScore(auth.userId);

    return json({ ok: true, message: 'Handynummer erfolgreich verifiziert!' });
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function err(status: number, message: string) {
    return new Response(JSON.stringify({ error: message }), { status, headers: { 'Content-Type': 'application/json' } });
}

