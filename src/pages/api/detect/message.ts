import type { APIRoute } from 'astro';
import { requireAuth, isAuthContext } from '../../../lib/auth-middleware';
import { checkRateLimit, rateLimitResponse } from '../../../lib/rate-limit';
import { detectMessageRealtime } from '../../../lib/ai-fraud-scanner';

/**
 * POST /api/detect/message
 * Leichtgewichtiger Echtzeit-Scan für Chat-Eingaben (Client-Debounce).
 * Keine DB-Calls – nur regelbasierte Heuristiken für schnelle Antworten.
 *
 * Body: { text: string }
 * Response: { isSafe: boolean, flags: string[], warning?: string }
 */
export const POST: APIRoute = async ({ request, cookies }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    // Rate limit: 120 requests/minute (debounced typing → ~2/sec max)
    if (!checkRateLimit(`detect:${auth.userId}`, 120, 60_000)) {
        return rateLimitResponse(60);
    }

    let body: unknown;
    try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
        });
    }

    const { text } = body as { text?: string };
    if (typeof text !== 'string') {
        return new Response(JSON.stringify({ error: 'text required' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
        });
    }

    const result = detectMessageRealtime(text);

    return new Response(JSON.stringify(result), {
        status: 200, headers: { 'Content-Type': 'application/json' },
    });
};

