import type { APIRoute } from 'astro';
import { randomBytes } from 'crypto';
import { hash } from '@node-rs/argon2';
import { z } from 'zod';
import { lucia, prisma } from '../../../lib/auth';
import { sendMail, emailVerifyHtml } from '../../../lib/mailer';
import { checkRateLimit, rateLimitResponse } from '../../../lib/rate-limit';

const RegisterSchema = z.object({
    email: z.string().email('Ungültige E-Mail-Adresse'),
    password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
    firstName: z.string().min(1).max(80).optional(),
    lastName: z.string().min(1).max(80).optional(),
    phone: z.string().min(4).max(30).optional(),
});

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
    // Strict rate limit: max 3 registrations per IP per 1 hour
    if (!checkRateLimit(`register_ip:${clientAddress}`, 3, 60 * 60 * 1000)) {
        return rateLimitResponse(60 * 60);
    }
    
    let body: unknown;
    try { body = await request.json(); } catch {
        return err(400, 'Invalid JSON');
    }

    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
        return err(400, parsed.error.issues[0]?.message ?? 'Validation error');
    }

    const { password, firstName, lastName, phone } = parsed.data;
    const email = parsed.data.email.toLowerCase().trim();

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return err(409, 'E-Mail bereits registriert');

    const passwordHash = await hash(password, {
        memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1,
    });

    const user = await prisma.user.create({
        data: { email, passwordHash, firstName, lastName, phone: phone || undefined },
    });

    const session = await lucia.createSession(user.id, {});
    const cookie = lucia.createSessionCookie(session.id);
    cookies.set(cookie.name, cookie.value, cookie.attributes);

    await prisma.auditLog.create({
        data: {
            actorId: user.id,
            action: 'register',
            ip: clientAddress,
            userAgent: request.headers.get('user-agent'),
        },
    });

    // Auto-send email verification
    try {
        const verifyToken = randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        await prisma.verification.upsert({
            where: { id: `email-${user.id}` },
            update: { status: 'PENDING', metaJson: { token: verifyToken }, expiresAt: expires },
            create: { id: `email-${user.id}`, userId: user.id, type: 'EMAIL', status: 'PENDING', metaJson: { token: verifyToken }, expiresAt: expires },
        });

        const verifyUrl = `${import.meta.env.APP_URL ?? 'http://localhost:4321'}/api/verify/email/confirm?token=${verifyToken}&uid=${user.id}`;
        await sendMail({ to: email, subject: 'Ehren-Deal – E-Mail bestätigen', html: emailVerifyHtml(verifyUrl) });
    } catch (e) {
        console.error('[register] Verification email failed:', e);
        // Registration still succeeds – user can request verification later
    }

    return new Response(JSON.stringify({
        ok: true,
        user: { id: user.id, email: user.email, role: user.role },
    }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

function err(status: number, message: string) {
    return new Response(JSON.stringify({ error: message }), {
        status, headers: { 'Content-Type': 'application/json' },
    });
}
