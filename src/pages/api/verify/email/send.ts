import type { APIRoute } from 'astro';
import { randomBytes } from 'crypto';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { sendMail, emailVerifyHtml } from '../../../../lib/mailer';
import { prisma } from '../../../../lib/auth';

/**
 * POST /api/verify/email/send
 * Generate token, store as Verification row, send email.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { email: true, emailVerified: true } });
    if (!user) return err(404, 'User not found');
    if (user.emailVerified) return json({ ok: true, message: 'E-Mail bereits verifiziert' });

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await prisma.verification.upsert({
        where: { id: `email-${auth.userId}` },
        update: { status: 'PENDING', metaJson: { token }, expiresAt: expires },
        create: { id: `email-${auth.userId}`, userId: auth.userId, type: 'EMAIL', status: 'PENDING', metaJson: { token }, expiresAt: expires },
    });

    const url = `${import.meta.env.APP_URL}/api/verify/email/confirm?token=${token}&uid=${auth.userId}`;

    await sendMail({ to: user.email, subject: 'Novamarkt – E-Mail bestätigen', html: emailVerifyHtml(url) });

    return json({ ok: true });
};

function json(data: unknown, s = 200) { return new Response(JSON.stringify(data), { status: s, headers: { 'Content-Type': 'application/json' } }); }
function err(s: number, e: string) { return new Response(JSON.stringify({ error: e }), { status: s, headers: { 'Content-Type': 'application/json' } }); }
