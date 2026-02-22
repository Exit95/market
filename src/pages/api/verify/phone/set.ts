import type { APIRoute } from 'astro';
import { requireAdmin, isAuthContext } from '../../../../lib/auth-middleware';
import { refreshTrustScore } from '../../../../lib/trust-score';
import { prisma } from '../../../../lib/auth';

/**
 * POST /api/verify/phone/set
 * MVP: Admin sets phone verified status for a user.
 * Production: Replace with OTP provider (e.g. Twilio Verify, Vonage).
 *
 * OTP Production Flow (placeholder):
 *  1. POST /api/verify/phone/send  { phone } -> sends OTP via provider
 *  2. POST /api/verify/phone/check { phone, code } -> validates OTP
 */
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
    const auth = await requireAdmin(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const { userId, verified = true } = (await request.json().catch(() => ({}))) as { userId?: string; verified?: boolean };
    if (!userId) return err(400, 'userId required');

    await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { phoneVerified: verified } }),
        prisma.verification.upsert({
            where: { id: `phone-${userId}` },
            update: { status: verified ? 'SUCCESS' : 'FAILED' },
            create: { id: `phone-${userId}`, userId, type: 'PHONE', status: verified ? 'SUCCESS' : 'FAILED' },
        }),
        prisma.auditLog.create({
            data: { actorId: auth.userId, action: 'admin_phone_verify', ip: clientAddress, metaJson: { userId, verified } },
        }),
    ]);

    await refreshTrustScore(userId);
    return json({ ok: true });
};

function json(data: unknown) { return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } }); }
function err(s: number, e: string) { return new Response(JSON.stringify({ error: e }), { status: s, headers: { 'Content-Type': 'application/json' } }); }
