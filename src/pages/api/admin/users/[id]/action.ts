import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin, isAuthContext } from '../../../../../lib/auth-middleware';
import { refreshTrustScore } from '../../../../../lib/trust-score';
import { prisma } from '../../../../../lib/auth';
import { lucia } from '../../../../../lib/auth';

const ActionSchema = z.discriminatedUnion('action', [
    z.object({ action: z.literal('ban'), reason: z.string().min(1) }),
    z.object({ action: z.literal('unban') }),
    z.object({ action: z.literal('shadowban'), reason: z.string().optional() }),
    z.object({ action: z.literal('unshadowban') }),
    z.object({ action: z.literal('verifyId') }),
    z.object({ action: z.literal('removeVerifyId') }),
    z.object({ action: z.literal('setLimit'), listingDayLimit: z.number().int().min(0) }),
    z.object({ action: z.literal('resolveSignal'), signalId: z.string() }),
]);

/**
 * POST /api/admin/users/:id/action
 */
export const POST: APIRoute = async ({ request, cookies, params, clientAddress }) => {
    const auth = await requireAdmin(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const targetId = params.id!;
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) return err(404, 'User not found');

    let body: unknown;
    try { body = await request.json(); } catch { return err(400, 'Invalid JSON'); }
    const parsed = ActionSchema.safeParse(body);
    if (!parsed.success) return err(400, parsed.error.issues[0]?.message ?? 'Invalid action');

    const act = parsed.data;
    let userUpdate: Record<string, unknown> = {};
    let auditMeta: Record<string, unknown> = { action: act.action };

    switch (act.action) {
        case 'ban':
            userUpdate = { bannedAt: new Date(), banReason: act.reason };
            // Invalidate all sessions
            await lucia.invalidateUserSessions(targetId);
            auditMeta.reason = act.reason;
            break;
        case 'unban':
            userUpdate = { bannedAt: null, banReason: null };
            break;
        case 'shadowban':
            userUpdate = { shadowBanned: true };
            auditMeta.reason = act.reason;
            break;
        case 'unshadowban':
            userUpdate = { shadowBanned: false };
            break;
        case 'verifyId':
            userUpdate = { idVerified: true };
            break;
        case 'removeVerifyId':
            userUpdate = { idVerified: false };
            break;
        case 'resolveSignal':
            await prisma.fraudSignal.update({
                where: { id: act.signalId },
                data: { resolvedAt: new Date() },
            });
            // No user update needed
            userUpdate = {};
            break;
        case 'setLimit':
            // Store custom limit in metaJson via TrustScore override (simple approach)
            auditMeta.listingDayLimit = act.listingDayLimit;
            break;
    }

    if (Object.keys(userUpdate).length > 0) {
        await prisma.user.update({ where: { id: targetId }, data: userUpdate });
    }

    await prisma.$transaction([
        prisma.adminAction.create({
            data: {
                adminId: auth.userId,
                targetUserId: targetId,
                actionType: act.action,
                metaJson: auditMeta,
            },
        }),
        prisma.auditLog.create({
            data: {
                actorId: auth.userId,
                action: `admin_${act.action}`,
                ip: clientAddress,
                metaJson: { targetUserId: targetId, ...auditMeta },
            },
        }),
    ]);

    await refreshTrustScore(targetId);
    return json({ ok: true, action: act.action });
};

function json(d: unknown, s = 200) { return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } }); }
function err(s: number, e: string) { return new Response(JSON.stringify({ error: e }), { status: s, headers: { 'Content-Type': 'application/json' } }); }
