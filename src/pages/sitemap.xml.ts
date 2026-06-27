import type { APIRoute } from 'astro';
import { prisma } from '../lib/auth';

/**
 * GET /sitemap.xml
 * Dynamische Sitemap mit statischen Seiten + aktiven Listings + Kategorien.
 */
export const GET: APIRoute = async () => {
    const baseUrl = 'https://ehren-deal.de';

    // Statische Seiten
    const staticPages = [
        { url: '/', priority: '1.0', changefreq: 'daily' },
        { url: '/kategorien', priority: '0.8', changefreq: 'daily' },
        { url: '/anmelden', priority: '0.5', changefreq: 'monthly' },
        { url: '/sicher-kaufen', priority: '0.7', changefreq: 'monthly' },
        { url: '/sicherheit', priority: '0.6', changefreq: 'monthly' },
        { url: '/kontakt', priority: '0.4', changefreq: 'monthly' },
        // Hilfe-Center
        { url: '/hilfe', priority: '0.6', changefreq: 'monthly' },
        { url: '/hilfe/erste-schritte', priority: '0.5', changefreq: 'monthly' },
        { url: '/hilfe/kaufen', priority: '0.5', changefreq: 'monthly' },
        { url: '/hilfe/verkaufen', priority: '0.5', changefreq: 'monthly' },
        { url: '/hilfe/zahlung', priority: '0.5', changefreq: 'monthly' },
        { url: '/hilfe/sicherheit', priority: '0.5', changefreq: 'monthly' },
        // Ratgeber (Blog)
        { url: '/ratgeber', priority: '0.7', changefreq: 'weekly' },
        { url: '/ratgeber/sicher-online-kaufen', priority: '0.6', changefreq: 'monthly' },
        { url: '/ratgeber/betrug-erkennen', priority: '0.6', changefreq: 'monthly' },
        { url: '/ratgeber/tipps-fuer-verkaeufer', priority: '0.6', changefreq: 'monthly' },
        { url: '/ratgeber/treuhand-erklaert', priority: '0.6', changefreq: 'monthly' },
        // Legal
        { url: '/agb', priority: '0.3', changefreq: 'yearly' },
        { url: '/datenschutz', priority: '0.3', changefreq: 'yearly' },
        { url: '/impressum', priority: '0.3', changefreq: 'yearly' },
    ];

    // Aktive Listings aus DB
    let listingUrls: { url: string; lastmod: string; priority: string }[] = [];
    try {
        const listings = await prisma.listing.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' },
            take: 5000,
        });
        listingUrls = listings.map(l => ({
            url: `/inserat/${l.id}`,
            lastmod: l.updatedAt.toISOString().split('T')[0],
            priority: '0.7',
        }));
    } catch (e) {
        console.error('[sitemap] DB-Fehler:', e);
    }

    // Öffentliche Profil-Seiten (verifizierte User mit Listings)
    let profileUrls: { url: string; priority: string }[] = [];
    try {
        const sellers = await prisma.user.findMany({
            where: {
                listings: { some: { status: 'ACTIVE' } },
            },
            select: { id: true },
            take: 2000,
        });
        profileUrls = sellers.map(u => ({
            url: `/profil/${u.id}`,
            priority: '0.5',
        }));
    } catch (e) {
        console.error('[sitemap] Profil-Fehler:', e);
    }

    const today = new Date().toISOString().split('T')[0];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(p => `  <url>
    <loc>${baseUrl}${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
${listingUrls.map(l => `  <url>
    <loc>${baseUrl}${l.url}</loc>
    <lastmod>${l.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${l.priority}</priority>
  </url>`).join('\n')}
${profileUrls.map(p => `  <url>
    <loc>${baseUrl}${p.url}</loc>
    <changefreq>weekly</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    return new Response(xml, {
        status: 200,
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600',
        },
    });
};
