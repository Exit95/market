import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { checkRateLimit, rateLimitResponse } from '../../../../lib/rate-limit';
import { filterMessage } from '../../../../lib/message-filter';
import { scanChatMessageKI } from '../../../../lib/ai-fraud-scanner';
import { publishMessage } from '../../../../lib/ably';
import { prisma } from '../../../../lib/auth';

const MessageSchema = z.object({
    body: z.string().min(1).max(2000).trim(),
});

// ── GET /api/conversations/:id/messages ───────────────────────────────────────
export const GET: APIRoute = async ({ request, cookies, params }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const conv = await prisma.conversation.findUnique({ where: { id: params.id } });
    if (!conv) return err(404, 'Conversation not found');
    if (conv.buyerId !== auth.userId && conv.sellerId !== auth.userId) return err(403, 'Forbidden');

    const cursor = new URL(request.url).searchParams.get('before');
    const messages = await prisma.message.findMany({
        where: {
            conversationId: params.id,
            ...(cursor && { createdAt: { lt: new Date(cursor) } }),
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
        include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    });

    // Mark received messages as read
    await prisma.message.updateMany({
        where: { conversationId: params.id, senderId: { not: auth.userId }, readAt: null },
        data: { readAt: new Date() },
    });

    return json(messages);
};

// ── POST /api/conversations/:id/messages ──────────────────────────────────────
export const POST: APIRoute = async ({ request, cookies, params, clientAddress }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    // Rate limit: 60 messages/minute
    if (!checkRateLimit(`msg:${auth.userId}`, 60, 60_000)) return rateLimitResponse(60);

    const conv = await prisma.conversation.findUnique({ where: { id: params.id } });
    if (!conv) return err(404, 'Conversation not found');
    if (conv.buyerId !== auth.userId && conv.sellerId !== auth.userId) return err(403, 'Forbidden');

    let body: unknown;
    try { body = await request.json(); } catch { return err(400, 'Invalid JSON'); }

    const parsed = MessageSchema.safeParse(body);
    if (!parsed.success) return err(400, parsed.error.issues[0]?.message ?? 'Validation error');

    // Content filter & Ehren-Deal Scam Scanner (Regel + KI)
    const { blocked, reason } = filterMessage(parsed.data.body);
    const { scanChatMessage } = await import('../../../../lib/security');
    const { isSafe, flags } = scanChatMessage(parsed.data.body);
    const kiResult = scanChatMessageKI(parsed.data.body);

    // Combine: blocked by regex filter OR security scanner OR KI hard-block
    const isBlocked = blocked || !isSafe || !kiResult.isSafe;

    if (isBlocked) {
        const allFlags = [...new Set([...flags, ...kiResult.flags])];
        const blockReason = blocked
            ? reason
            : !isSafe
                ? `Potenzieller Betrugsversuch erkannt: ${flags.join(', ')}`
                : kiResult.warning;

        // FraudSignal bei schweren Verstößen
        if (allFlags.length > 0) {
            await prisma.fraudSignal.create({
                data: {
                    userId: auth.userId,
                    type: 'KI_CHAT_BLOCKED',
                    severity: kiResult.score >= 0.7 ? 'CRITICAL' : 'HIGH',
                    metaJson: { conversationId: params.id, flags: allFlags, kiScore: kiResult.score },
                },
            });
        }

        await prisma.auditLog.create({
            data: {
                actorId: auth.userId,
                action: 'message_blocked',
                ip: clientAddress,
                metaJson: { conversationId: params.id, reason: blockReason, flags: allFlags, kiScore: kiResult.score },
            },
        });
        return err(400, 'Sicherheitsrichtlinie: Diese Nachricht verstößt gegen unsere Sicherheits- und Anti-Scam-Richtlinien (z.B. Weiterleitung auf externe Messenger oder verdächtige Links).');
    }

    // KI-Warnung (nicht blockiert, aber verdächtig) – als Soft-Signal loggen
    if (kiResult.warning) {
        await prisma.auditLog.create({
            data: {
                actorId: auth.userId,
                action: 'message_ki_warning',
                ip: clientAddress,
                metaJson: { conversationId: params.id, flags: kiResult.flags, kiScore: kiResult.score },
            },
        });
    }

    const message = await prisma.message.create({
        data: { conversationId: params.id!, senderId: auth.userId, body: parsed.data.body },
        include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    });

    // Update conversation updatedAt for sorting
    await prisma.conversation.update({ where: { id: params.id }, data: { updatedAt: new Date() } });

    // Publish to Ably (non-blocking)
    publishMessage(params.id!, {
        id: message.id,
        body: message.body,
        createdAt: message.createdAt,
        sender: message.sender,
    }).catch(console.error);

    await prisma.auditLog.create({
        data: {
            actorId: auth.userId,
            action: 'message_send',
            ip: clientAddress,
            metaJson: { conversationId: params.id, messageId: message.id },
        },
    });

    return json(message, 201);
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
function err(status: number, error: string) {
    return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });
}
