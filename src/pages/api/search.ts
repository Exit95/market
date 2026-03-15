/**
 * GET /api/search?q=...&kategorie=...&plz=...&minPreis=...&maxPreis=...&seite=...
 * Proxies search queries to Algolia (keeps admin key server-side)
 */
import type { APIRoute } from 'astro';
import { searchListings } from '../../lib/algolia';

export const GET: APIRoute = async ({ url }) => {
    try {
        const q = url.searchParams.get('q') || '';
        const kategorie = url.searchParams.get('kategorie') || undefined;
        const zustand = url.searchParams.get('zustand') || undefined;
        const minPreis = url.searchParams.get('minPreis') ? Number(url.searchParams.get('minPreis')) : undefined;
        const maxPreis = url.searchParams.get('maxPreis') ? Number(url.searchParams.get('maxPreis')) : undefined;
        const sortBy = (url.searchParams.get('sortBy') as 'relevance' | 'price_asc' | 'price_desc' | 'newest') || 'relevance';
        const seite = url.searchParams.get('seite') ? Number(url.searchParams.get('seite')) : 0;
        const nurVerfiziert = url.searchParams.get('nurVerifiziert') === 'true';
        const nurTreuhand = url.searchParams.get('nurTreuhand') === 'true';

        const results = await searchListings(q, {
            kategorie,
            zustand,
            minPreis,
            maxPreis,
            sortBy,
            page: seite,
            hitsPerPage: 20,
            nurVerfiziert,
            nurTreuhand,
        });

        return new Response(JSON.stringify(results), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                // Cache search results for 30 seconds
                'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
            },
        });
    } catch (err) {
        console.error('[search] Error:', err);
        return new Response(JSON.stringify({ error: 'Suche fehlgeschlagen.', hits: [], totalHits: 0, pages: 0 }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
