import type { APIRoute } from 'astro';
import { hash, verify } from '@node-rs/argon2';
import { z } from 'zod';
import { requireAuth, isAuthContext } from '../../../lib/auth-middleware';
import { prisma } from '../../../lib/auth';
import { checkRateLimit, rateLimitResponse } from '../../../lib/rate-limit';

const Schema = z.object({
    currentPassword: z.string().min(1, 'Aktuelles Passwort erforderlich'),
    newPassword: z.string().min(8, 'Neues Passwort muss mindestens 8 Zeichen haben'),
});

/**
 * POST /api/auth/change-password
 * Changes the current user's password.
 */
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    if (!checkRateLimit(`change_pw:${auth.userId}`, 5, 60 * 60 * 1000)) {
        return rateLimitResponse(60 * 60);
    }

    let body: unknown;
    try { body = await request.json(); } catch {
        return err(400, 'Invalid JSON');
    }

    const parsed = Schema.safeParse(body);
    if (!parsed.success) return err(400, parsed.error.issues[0]?.message ?? 'Validierungsfehler');

    const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { passwordHash: true },
    });
    if (!user) return err(404, 'User nicht gefunden');

    // Verify current password
    const valid = await verify(user.passwordHash, parsed.data.currentPassword);
    if (!valid) return err(403, 'Aktuelles Passwort ist falsch');

    // Hash new password
    const newHash = await hash(parsed.data.newPassword, {
        memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1,
    });

    await prisma.user.update({
        where: { id: auth.userId },
        data: { passwordHash: newHash },
    });

    await prisma.auditLog.create({
        data: {
            actorId: auth.userId,
            action: 'password_changed',
            ip: clientAddress,
        },
    });

    return new Response(JSON.stringify({ ok: true, message: 'Passwort erfolgreich geändert' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
};

function err(status: number, message: string) {
    return new Response(JSON.stringify({ error: message }), {
        status, headers: { 'Content-Type': 'application/json' },
    });
}

