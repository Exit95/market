#!/usr/bin/env tsx
/**
 * scripts/index-listings.ts
 * ---------------------------------------------------------------------------
 * Einmalig (oder bei Bedarf) alle aktiven Anzeigen aus der Datenbank in den
 * Algolia-Suchindex schreiben.
 *
 * Run:
 *   npx tsx scripts/index-listings.ts
 *
 * Umgebungsvariablen (aus .env):
 *   DATABASE_URL, ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY, ALGOLIA_INDEX_NAME
 * ---------------------------------------------------------------------------
 */

import { PrismaClient } from '@prisma/client';
import { algoliasearch } from 'algoliasearch';
import type { ListingRecord } from '../src/lib/algolia.ts';

const prisma = new PrismaClient();

const APP_ID = process.env.ALGOLIA_APP_ID;
const ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY;
const INDEX_NAME = process.env.ALGOLIA_INDEX_NAME ?? 'listings';

const CENTS_PER_EURO = 100;
const BATCH_SIZE = 1000;

if (!APP_ID || !ADMIN_KEY) {
    console.error('[index-listings] ALGOLIA_APP_ID und ALGOLIA_ADMIN_KEY müssen gesetzt sein.');
    process.exit(1);
}

const client = algoliasearch(APP_ID, ADMIN_KEY);

// ─── Category mapping ─────────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, { label: string; slug: string }> = {
    ELEKTRONIK: { label: 'Elektronik', slug: 'elektronik' },
    FAHRZEUGE:  { label: 'Fahrzeuge', slug: 'fahrzeuge' },
    MODE:       { label: 'Mode & Kleidung', slug: 'mode' },
    MOEBEL:     { label: 'Möbel & Wohnen', slug: 'moebel' },
    SPORT:      { label: 'Sport & Freizeit', slug: 'sport' },
    HAUSHALT:   { label: 'Haushalt', slug: 'haushalt' },
    BUCHER:     { label: 'Bücher & Medien', slug: 'bucher' },
    SPIELZEUG:  { label: 'Spielzeug', slug: 'spielzeug' },
    SONSTIGES:  { label: 'Sonstiges', slug: 'sonstiges' },
};

// ─── Configure index settings ─────────────────────────────────────────────────

async function configureIndex(): Promise<void> {
    await client.setSettings({
        indexName: INDEX_NAME,
        indexSettings: {
            searchableAttributes: ['title', 'description', 'category', 'location', 'sellerName'],
            attributesForFaceting: [
                'filterOnly(category)',
                'filterOnly(categorySlug)',
                'filterOnly(condition)',
                'filterOnly(sellerVerified)',
                'filterOnly(kycVerified)',
                'filterOnly(treuhandAvailable)',
                'filterOnly(plz)',
            ],
            ranking: ['typo', 'geo', 'words', 'filters', 'proximity', 'attribute', 'exact', 'custom'],
            customRanking: ['desc(postedAtTimestamp)', 'desc(sellerRating)'],
            numericAttributesForFiltering: ['price', 'sellerRating', 'postedAtTimestamp'],
        },
    });
    console.log('[index-listings] Index-Einstellungen konfiguriert.');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    await configureIndex();

    const listings = await prisma.listing.findMany({
        where: { status: 'ACTIVE', seller: { shadowBanned: false } },
        select: {
            id:          true,
            title:       true,
            description: true,
            price:       true,
            category:    true,
            city:        true,
            postalCode:  true,
            condition:   true,
            treuhand:    true,
            createdAt:   true,
            seller: {
                select: {
                    firstName:    true,
                    lastName:     true,
                    emailVerified: true,
                    idVerified:   true,
                    trustScore:   { select: { score: true } },
                },
            },
            images: { take: 1, orderBy: { position: 'asc' }, select: { url: true } },
        },
    });

    console.log(`[index-listings] ${listings.length} aktive Anzeigen gefunden.`);

    if (listings.length === 0) {
        console.log('[index-listings] Nichts zu indexieren.');
        return;
    }

    const records: ListingRecord[] = listings.map((l) => {
        const cat = CATEGORY_MAP[l.category] ?? { label: l.category, slug: l.category.toLowerCase() };
        const sellerFirst = l.seller.firstName ?? '';
        const sellerLast  = l.seller.lastName ?? '';
        const sellerName  = [sellerFirst, sellerLast].filter(Boolean).join(' ') || 'Unbekannt';

        return {
            objectID:          l.id,
            title:             l.title,
            description:       l.description,
            price:             l.price / CENTS_PER_EURO,  // Cent → Euro
            category:          cat.label,
            categorySlug:      cat.slug,
            location:          l.city,
            plz:               l.postalCode,
            condition:         l.condition ?? '',
            image:             l.images[0]?.url ?? '',
            sellerName,
            sellerRating:      l.seller.trustScore?.score ?? 0,
            sellerVerified:    l.seller.emailVerified,
            kycVerified:       l.seller.idVerified,
            treuhandAvailable: l.treuhand,
            postedAt:          l.createdAt.toLocaleDateString('de-DE'),
            postedAtTimestamp: Math.floor(l.createdAt.getTime() / 1000),
        };
    });

    // Batch indexing to avoid hitting API limits for large datasets
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        await client.saveObjects({ indexName: INDEX_NAME, objects: batch });
        console.log(`[index-listings] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} Anzeigen indexiert.`);
    }

    console.log(`[index-listings] Fertig – ${records.length} Anzeigen erfolgreich indexiert.`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
