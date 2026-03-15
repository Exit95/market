import type { APIRoute } from 'astro';

/**
 * GET /api/health
 * Healthcheck endpoint – genutzt von Docker HEALTHCHECK und Load Balancern.
 */
export const GET: APIRoute = async () => {
    return new Response(
        JSON.stringify({
            ok: true,
            service: 'ehren-deal',
            ts: new Date().toISOString(),
            env: import.meta.env.MODE,
        }),
        {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
            },
        },
    );
};
