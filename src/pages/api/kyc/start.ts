import type { APIRoute } from 'astro';
import { requireAuth, isAuthContext } from '../../../lib/auth-middleware';
import { createIdent } from '../../../lib/idnow';
import { prisma } from '../../../lib/auth';

/**
 * POST /api/kyc/start
 * Startet eine IDnow-KYC-Session für den eingeloggten Nutzer.
 * Gibt die Redirect-URL zurück, zu der der Browser geleitet werden soll.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    // Check if already verified
    const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { idVerified: true, email: true },
    });
    if (!user) return err(404, 'User nicht gefunden');
    if (user.idVerified) return json({ ok: true, message: 'Bereits verifiziert', redirectUrl: null });

    try {
        const result = await createIdent(auth.userId, user.email);

        // Store KYC ident ID on user
        await prisma.user.update({
            where: { id: auth.userId },
            data: { kycIdentId: result.identId },
        });

        await prisma.verification.upsert({
            where: { id: `id-${auth.userId}` },
            update: { status: 'PENDING', metaJson: { identId: result.identId } },
            create: { id: `id-${auth.userId}`, userId: auth.userId, type: 'ID_KYC', status: 'PENDING', metaJson: { identId: result.identId } },
        });

        return json({
            identId: result.identId,
            redirectUrl: result.redirectUrl,
            status: result.status,
        });
    } catch (e) {
        console.error('[KYC start]', e);
        return err(500, 'KYC-Session konnte nicht gestartet werden. Bitte später erneut versuchen.');
    }
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function err(status: number, message: string) {
    return new Response(JSON.stringify({ error: message }), { status, headers: { 'Content-Type': 'application/json' } });
}
