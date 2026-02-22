import type { APIRoute } from 'astro';
import { lucia, prisma } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
    const sessionId = cookies.get(lucia.sessionCookieName)?.value;
    if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Not logged in' }), {
            status: 401, headers: { 'Content-Type': 'application/json' },
        });
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session) {
        // Clear stale cookie
        const blank = lucia.createBlankSessionCookie();
        cookies.set(blank.name, blank.value, blank.attributes);
        return new Response(JSON.stringify({ error: 'Session invalid' }), {
            status: 401, headers: { 'Content-Type': 'application/json' },
        });
    }

    await lucia.invalidateSession(session.id);
    const blank = lucia.createBlankSessionCookie();
    cookies.set(blank.name, blank.value, blank.attributes);

    await prisma.auditLog.create({
        data: {
            userId: user?.id,
            action: 'logout',
            ip: clientAddress,
            userAgent: request.headers.get('user-agent'),
        },
    });

    return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
    });
};
