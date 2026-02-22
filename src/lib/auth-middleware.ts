/**
 * src/lib/auth-middleware.ts
 * requireAuth() + requireAdmin() Helper für API Routes
 */
import type { AstroCookies } from 'astro';
import { lucia } from './auth';

export interface AuthContext {
    userId: string;
    sessionId: string;
    user: {
        email: string;
        firstName: string | null;
        lastName: string | null;
        role: string;
        emailVerified: boolean;
        kycStatus: string;
        trustScore: number;
    };
}

function getBearerOrCookie(request: Request, cookies: AstroCookies): string | null {
    const auth = request.headers.get('Authorization');
    if (auth?.startsWith('Bearer ')) return auth.slice(7);
    return cookies.get(lucia.sessionCookieName)?.value ?? null;
}

export async function requireAuth(
    request: Request,
    cookies: AstroCookies,
): Promise<AuthContext | Response> {
    const sessionId = getBearerOrCookie(request, cookies);
    if (!sessionId) return unauthorized();

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || !user) return unauthorized();

    // Banned users cannot act
    const dbUser = await import('./auth').then(m => m.prisma.user.findUnique({
        where: { id: user.id },
        select: { bannedAt: true, banReason: true },
    }));
    if (dbUser?.bannedAt) {
        return new Response(JSON.stringify({ error: 'Account gesperrt', reason: dbUser.banReason ?? 'Verstoß gegen Nutzungsbedingungen' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Rolling session – refresh cookie if near expiry
    if (session.fresh) {
        const cookie = lucia.createSessionCookie(session.id);
        cookies.set(cookie.name, cookie.value, cookie.attributes);
    }

    return { userId: user.id, sessionId: session.id, user: user as unknown as AuthContext['user'] };
}

export async function requireAdmin(
    request: Request,
    cookies: AstroCookies,
): Promise<AuthContext | Response> {
    const result = await requireAuth(request, cookies);
    if (result instanceof Response) return result;
    if (result.user.role !== 'ADMIN') return forbidden();
    return result;
}

export function isAuthContext(v: AuthContext | Response): v is AuthContext {
    return !(v instanceof Response);
}

function unauthorized() {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
    });
}

function forbidden() {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
    });
}
