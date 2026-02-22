import type { APIRoute } from 'astro';
import { hash } from '@node-rs/argon2';
import { z } from 'zod';
import { lucia, prisma } from '../../../lib/auth';

const RegisterSchema = z.object({
    email: z.string().email('Ungültige E-Mail-Adresse'),
    password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
    firstName: z.string().min(1).max(80).optional(),
    lastName: z.string().min(1).max(80).optional(),
});

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
    let body: unknown;
    try { body = await request.json(); } catch {
        return err(400, 'Invalid JSON');
    }

    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
        return err(400, parsed.error.issues[0]?.message ?? 'Validation error');
    }

    const { email, password, firstName, lastName } = parsed.data;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return err(409, 'E-Mail bereits registriert');

    const passwordHash = await hash(password, {
        memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1,
    });

    const user = await prisma.user.create({
        data: { email, passwordHash, firstName, lastName },
    });

    const session = await lucia.createSession(user.id, {});
    const cookie = lucia.createSessionCookie(session.id);
    cookies.set(cookie.name, cookie.value, cookie.attributes);

    await prisma.auditLog.create({
        data: {
            userId: user.id,
            action: 'register',
            ip: clientAddress,
            userAgent: request.headers.get('user-agent'),
        },
    });

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
