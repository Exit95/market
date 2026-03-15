import type { APIRoute } from 'astro';
import { verify } from '@node-rs/argon2';
import { z } from 'zod';
import { lucia, prisma } from '../../../lib/auth';
import { checkRateLimit, rateLimitResponse } from '../../../lib/rate-limit';

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
    // Strict rate limit: 5 login attempts per 15 minutes per IP
    if (!checkRateLimit(`login_ip:${clientAddress}`, 5, 15 * 60 * 1000)) {
        return rateLimitResponse(15 * 60); // Retry after 15 mins
    }
    
    let body: unknown;
    try { body = await request.json(); } catch {
        return err(400, 'Invalid JSON');
    }

    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) return err(400, 'E-Mail oder Passwort ungültig');

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    // Constant-time: always run verify to prevent timing-based user enumeration
    const DUMMY_HASH = '$argon2id$v=19$m=19456,t=2,p=1$aaaaaaaaaaaaaaaa$bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const hashToCheck = user?.passwordHash ?? DUMMY_HASH;
    let valid = false;
    try {
        valid = await verify(hashToCheck, password);
    } catch {
        // verify throws on malformed hashes (e.g. dummy) – treat as invalid
        valid = false;
    }
    // Even if hash matched the dummy, reject if user doesn't exist
    if (!user) valid = false;

    if (!user || !valid) {
        await prisma.auditLog.create({
            data: {
                actorId: user?.id,
                action: 'failed_login',
                ip: clientAddress,
                userAgent: request.headers.get('user-agent'),
                metaJson: { email },
            },
        });
        return err(401, 'E-Mail oder Passwort falsch');
    }

    const session = await lucia.createSession(user.id, {});
    const cookie = lucia.createSessionCookie(session.id);
    cookies.set(cookie.name, cookie.value, cookie.attributes);

    await prisma.auditLog.create({
        data: {
            actorId: user.id,
            action: 'login',
            ip: clientAddress,
            userAgent: request.headers.get('user-agent'),
        },
    });

    return new Response(JSON.stringify({
        ok: true,
        user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

function err(status: number, message: string) {
    return new Response(JSON.stringify({ error: message }), {
        status, headers: { 'Content-Type': 'application/json' },
    });
}
