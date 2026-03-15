import type { APIRoute } from 'astro';
import { randomBytes, createHash } from 'crypto';
import { z } from 'zod';
import { prisma } from '../../../lib/auth';
import { sendMail, passwordResetHtml } from '../../../lib/mailer';
import { checkRateLimit, rateLimitResponse } from '../../../lib/rate-limit';

const Schema = z.object({
    email: z.string().email(),
});

/**
 * POST /api/auth/forgot-password
 * Sends a password-reset link. Always returns generic success to prevent user enumeration.
 */
export const POST: APIRoute = async ({ request, clientAddress }) => {
    // Rate limit: max 5 reset requests per IP per day
    if (!checkRateLimit(`forgot_ip:${clientAddress}`, 5, 24 * 60 * 60 * 1000)) {
        return rateLimitResponse(24 * 60 * 60);
    }

    let body: unknown;
    try { body = await request.json(); } catch {
        return err(400, 'Invalid JSON');
    }

    const parsed = Schema.safeParse(body);
    if (!parsed.success) return err(400, 'Ungültige E-Mail-Adresse');

    const email = parsed.data.email.toLowerCase().trim();

    // Generic response to prevent user enumeration
    const genericOk = () => json({ ok: true, message: 'Falls ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.' });

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, bannedAt: true } });
    if (!user || user.bannedAt) return genericOk();

    // Per-user rate limit: max 3 resets per hour
    if (!checkRateLimit(`forgot_user:${user.id}`, 3, 60 * 60 * 1000)) {
        return genericOk(); // Don't reveal rate limit to prevent enumeration
    }

    // Generate token: 40 random bytes → hex
    const rawToken = randomBytes(40).toString('hex');

    // Store SHA256 hash of token (never store plaintext in DB)
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete old password reset verifications for this user
    await prisma.verification.deleteMany({
        where: { userId: user.id, type: 'PASSWORD_RESET' },
    });

    await prisma.verification.create({
        data: {
            userId: user.id,
            type: 'PASSWORD_RESET',
            status: 'PENDING',
            metaJson: { tokenHash },
            expiresAt: expires,
        },
    });

    // Send email with plaintext token in URL
    const resetUrl = `${import.meta.env.APP_URL ?? 'http://localhost:4321'}/passwort-reset/${rawToken}?uid=${user.id}`;
    try {
        await sendMail({
            to: email,
            subject: 'Ehren-Deal – Passwort zurücksetzen',
            html: passwordResetHtml(resetUrl),
        });
    } catch (e) {
        console.error('[forgot-password] Mail send failed:', e);
        // Still return ok to prevent enumeration
    }

    await prisma.auditLog.create({
        data: {
            actorId: user.id,
            action: 'password_reset_requested',
            ip: clientAddress,
            userAgent: request.headers.get('user-agent'),
            metaJson: { email },
        },
    });

    return genericOk();
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
function err(status: number, error: string) {
    return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });
}

