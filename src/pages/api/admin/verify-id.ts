import type { APIRoute } from 'astro';
import { requireAdmin, isAuthContext } from '../../../lib/auth-middleware';
import { refreshTrustScore } from '../../../lib/trust-score';
import { prisma } from '../../../lib/auth';

/**
 * POST /api/admin/verify-id
 * Admin sets ID (KYC) verification status for a user.
 */
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
    const auth = await requireAdmin(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const { userId, verified = true, note } =
        (await request.json().catch(() => ({}))) as { userId?: string; verified?: boolean; note?: string };
    if (!userId) return err(400, 'userId required');

    await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { idVerified: verified } }),
        prisma.verification.upsert({
            where: { id: `id-${userId}` },
            update: { status: verified ? 'SUCCESS' : 'FAILED', metaJson: { note } },
            create: { id: `id-${userId}`, userId, type: 'ID_KYC', status: verified ? 'SUCCESS' : 'FAILED', metaJson: { note } },
        }),
        prisma.adminAction.create({
            data: { adminId: auth.userId, targetUserId: userId, actionType: 'id_verify', metaJson: { verified, note } },
        }),
    ]);

    await refreshTrustScore(userId);
    return json({ ok: true });
};

function json(data: unknown) { return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } }); }
function err(s: number, e: string) { return new Response(JSON.stringify({ error: e }), { status: s, headers: { 'Content-Type': 'application/json' } }); }
