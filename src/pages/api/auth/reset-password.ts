import type { APIRoute } from 'astro';
import { createHash } from 'crypto';
import { hash } from '@node-rs/argon2';
import { z } from 'zod';
import { lucia, prisma } from '../../../lib/auth';
import { checkRateLimit, rateLimitResponse } from '../../../lib/rate-limit';

const Schema = z.object({
    token: z.string().min(1, 'Token fehlt'),
    uid: z.string().min(1, 'User-ID fehlt'),
    password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
});

/**
 * POST /api/auth/reset-password
 * Validates token (SHA256 comparison), sets new password, invalidates all sessions.
 */
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
    // Rate limit: max 10 attempts per IP per hour
    if (!checkRateLimit(`reset_ip:${clientAddress}`, 10, 60 * 60 * 1000)) {
        return rateLimitResponse(60 * 60);
    }

    let body: unknown;
    try { body = await request.json(); } catch {
        return err(400, 'Invalid JSON');
    }

    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
        return err(400, parsed.error.issues[0]?.message ?? 'Validation error');
    }

    const { token, uid, password } = parsed.data;

    // Hash the incoming token to compare with stored hash
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // Find valid password reset verification
    const verification = await prisma.verification.findFirst({
        where: {
            userId: uid,
            type: 'PASSWORD_RESET',
            status: 'PENDING',
        },
    });

    if (!verification) return err(400, 'Ungültiger oder abgelaufener Link. Bitte fordere einen neuen an.');

    // Check expiration
    if (verification.expiresAt && verification.expiresAt < new Date()) {
        await prisma.verification.update({
            where: { id: verification.id },
            data: { status: 'EXPIRED' },
        });
        return err(400, 'Der Link ist abgelaufen. Bitte fordere einen neuen an.');
    }

    // Compare token hash
    const meta = verification.metaJson as { tokenHash?: string };
    if (!meta?.tokenHash || meta.tokenHash !== tokenHash) {
        return err(400, 'Ungültiger Link. Bitte fordere einen neuen an.');
    }

    // Hash new password with Argon2id (OWASP recommended parameters)
    const passwordHash = await hash(password, {
        memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1,
    });

    // Transaction: update password + mark verification as used + delete all sessions
    await prisma.$transaction([
        prisma.user.update({
            where: { id: uid },
            data: { passwordHash },
        }),
        prisma.verification.update({
            where: { id: verification.id },
            data: { status: 'SUCCESS' },
        }),
        // Delete all password reset tokens for this user
        prisma.verification.deleteMany({
            where: { userId: uid, type: 'PASSWORD_RESET', id: { not: verification.id } },
        }),
    ]);

    // Invalidate ALL existing sessions (security: prevent session fixation)
    await lucia.invalidateUserSessions(uid);

    // Create fresh session
    const session = await lucia.createSession(uid, {});
    const cookie = lucia.createSessionCookie(session.id);
    cookies.set(cookie.name, cookie.value, cookie.attributes);

    // Audit log
    await prisma.auditLog.create({
        data: {
            actorId: uid,
            action: 'password_reset_completed',
            ip: clientAddress,
            userAgent: request.headers.get('user-agent'),
        },
    });

    return json({ ok: true, message: 'Passwort erfolgreich geändert.' });
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
function err(status: number, error: string) {
    return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });
}

