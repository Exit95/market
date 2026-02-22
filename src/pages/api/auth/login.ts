import type { APIRoute } from 'astro';
import { verify } from '@node-rs/argon2';
import { z } from 'zod';
import { lucia, prisma } from '../../../lib/auth';

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
    let body: unknown;
    try { body = await request.json(); } catch {
        return err(400, 'Invalid JSON');
    }

    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) return err(400, 'E-Mail oder Passwort ungültig');

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    // Constant-time-ähnlich: hash auch bei fehlendem User prüfen
    const hashToCheck = user?.passwordHash ?? '$argon2id$v=19$m=19456,t=2,p=1$dummy';
    const valid = user ? await verify(hashToCheck, password) : false;

    if (!user || !valid) {
        await prisma.auditLog.create({
            data: {
                userId: user?.id,
                action: 'failed_login',
                ip: clientAddress,
                userAgent: request.headers.get('user-agent'),
                meta: { email },
            },
        });
        return err(401, 'E-Mail oder Passwort falsch');
    }

    const session = await lucia.createSession(user.id, {});
    const cookie = lucia.createSessionCookie(session.id);
    cookies.set(cookie.name, cookie.value, cookie.attributes);

    await prisma.auditLog.create({
        data: {
            userId: user.id,
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
