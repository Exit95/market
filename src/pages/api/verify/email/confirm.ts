import type { APIRoute } from 'astro';
import { refreshTrustScore } from '../../../../lib/trust-score';
import { prisma } from '../../../../lib/auth';

/**
 * GET /api/verify/email/confirm?token=xxx&uid=xxx
 * Validates token, sets emailVerified, refreshes trust score.
 */
export const GET: APIRoute = async ({ url, redirect }) => {
    const token = url.searchParams.get('token');
    const uid = url.searchParams.get('uid');

    if (!token || !uid) return err(400, 'Ungültiger Link');

    const v = await prisma.verification.findUnique({ where: { id: `email-${uid}` } });
    if (!v || v.status !== 'PENDING') return err(400, 'Token ungültig oder bereits verwendet');
    if (v.expiresAt && v.expiresAt < new Date()) return err(400, 'Token abgelaufen');

    const meta = v.metaJson as { token?: string };
    if (meta?.token !== token) return err(400, 'Token ungültig');

    await prisma.$transaction([
        prisma.user.update({ where: { id: uid }, data: { emailVerified: true } }),
        prisma.verification.update({ where: { id: `email-${uid}` }, data: { status: 'SUCCESS' } }),
    ]);

    await refreshTrustScore(uid);

    return redirect('/profil?verified=email');
};

function err(s: number, e: string) {
    return new Response(`<html><body><h2>${e}</h2><a href="/">Zurück</a></body></html>`, { status: s, headers: { 'Content-Type': 'text/html' } });
}
