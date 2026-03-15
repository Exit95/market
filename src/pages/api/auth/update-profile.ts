import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAuth, isAuthContext } from '../../../lib/auth-middleware';
import { prisma } from '../../../lib/auth';

const UpdateSchema = z.object({
    firstName: z.string().max(80).optional(),
    lastName: z.string().max(80).optional(),
    phone: z.string().max(30).optional(),
    city: z.string().max(100).optional(),
    postalCode: z.string().max(10).optional(),
    avatarUrl: z.string().url().max(500).optional(),
});

/**
 * POST /api/auth/update-profile
 * Updates the current user's profile fields.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    let body: unknown;
    try { body = await request.json(); } catch {
        return err(400, 'Invalid JSON');
    }

    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return err(400, parsed.error.issues[0]?.message ?? 'Validierungsfehler');

    const data: Record<string, string | undefined> = {};
    if (parsed.data.firstName !== undefined) data.firstName = parsed.data.firstName || undefined;
    if (parsed.data.lastName !== undefined) data.lastName = parsed.data.lastName || undefined;
    if (parsed.data.city !== undefined) data.city = parsed.data.city || undefined;
    if (parsed.data.postalCode !== undefined) data.postalCode = parsed.data.postalCode || undefined;
    if (parsed.data.avatarUrl !== undefined) data.avatarUrl = parsed.data.avatarUrl || undefined;

    // If phone changes, reset phoneVerified
    if (parsed.data.phone !== undefined) {
        const currentUser = await prisma.user.findUnique({ where: { id: auth.userId }, select: { phone: true } });
        data.phone = parsed.data.phone || undefined;
        if (currentUser?.phone !== parsed.data.phone) {
            (data as any).phoneVerified = false;
        }
    }

    const user = await prisma.user.update({
        where: { id: auth.userId },
        data,
        select: { firstName: true, lastName: true, phone: true, city: true, postalCode: true, avatarUrl: true },
    });

    return new Response(JSON.stringify({ ok: true, user }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
};

function err(status: number, message: string) {
    return new Response(JSON.stringify({ error: message }), {
        status, headers: { 'Content-Type': 'application/json' },
    });
}

