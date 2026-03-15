import type { APIRoute } from 'astro';
import { createIdent } from '../../../lib/idnow';

/**
 * POST /api/kyc/start
 * Startet eine IDnow-KYC-Session für den eingeloggten Nutzer.
 * Gibt die Redirect-URL zurück, zu der der Browser geleitet werden soll.
 *
 * Body: { userId: string, email: string }
 */
export const POST: APIRoute = async ({ request }) => {
    try {
        let body: { userId?: string; email?: string };
        try {
            body = await request.json();
        } catch {
            return new Response(JSON.stringify({ error: 'Ungültiger JSON-Body' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const { userId, email } = body;

        if (!userId || !email) {
            return new Response(
                JSON.stringify({ error: 'userId und email sind erforderlich' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
        }

        const result = await createIdent(userId, email);

        return new Response(
            JSON.stringify({
                identId: result.identId,
                redirectUrl: result.redirectUrl,
                status: result.status,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
    } catch (err) {
        console.error('[KYC start]', err);
        return new Response(
            JSON.stringify({ error: 'KYC-Session konnte nicht gestartet werden' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
        );
    }
};
