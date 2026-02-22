/**
 * Algolia Search Integration
 * Docs: https://www.algolia.com/doc/api-client/getting-started/
 *
 * Index name: listings
 * Indexed fields: title, description, category, location, price, condition, sellerVerified, treuhandAvailable
 */

import { algoliasearch } from 'algoliasearch';

const APP_ID = import.meta.env.ALGOLIA_APP_ID;
const ADMIN_KEY = import.meta.env.ALGOLIA_ADMIN_KEY;
const INDEX_NAME = import.meta.env.ALGOLIA_INDEX_NAME || 'listings';

// Admin client — only use server-side (has write access)
const adminClient = algoliasearch(APP_ID, ADMIN_KEY);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ListingRecord {
    objectID: string;
    title: string;
    description: string;
    price: number;
    category: string;
    categorySlug: string;
    location: string;
    plz: string;
    condition: string;
    image: string;
    sellerName: string;
    sellerRating: number;
    sellerVerified: boolean;
    kycVerified: boolean;
    treuhandAvailable: boolean;
    postedAt: string;
    postedAtTimestamp: number;
    /** Geo-coordinates for Algolia radius search */
    _geoloc?: { lat: number; lng: number };
}

export interface SearchFilters {
    kategorie?: string;
    plz?: string;
    umkreisKm?: number;
    minPreis?: number;
    maxPreis?: number;
    zustand?: string;
    nurVerfiziert?: boolean;
    nurTreuhand?: boolean;
    sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'newest';
    page?: number;
    hitsPerPage?: number;
}

// ─── Indexing (Server-Side Only) ──────────────────────────────────────────────

/**
 * Add or update a listing in the Algolia index
 */
export async function indexListing(listing: ListingRecord): Promise<void> {
    await adminClient.saveObject({
        indexName: INDEX_NAME,
        body: listing,
    });
}

/**
 * Remove a listing from the Algolia index
 */
export async function removeListing(id: string): Promise<void> {
    await adminClient.deleteObject({ indexName: INDEX_NAME, objectID: id });
}

/**
 * Bulk index multiple listings (e.g. initial data sync)
 */
export async function bulkIndexListings(listings: ListingRecord[]): Promise<void> {
    await adminClient.saveObjects({ indexName: INDEX_NAME, objects: listings });
}

/**
 * Configure index settings (call once during setup)
 */
export async function configureIndex(): Promise<void> {
    await adminClient.setSettings({
        indexName: INDEX_NAME,
        indexSettings: {
            searchableAttributes: [
                'title',
                'description',
                'category',
                'location',
                'sellerName',
            ],
            attributesForFaceting: [
                'filterOnly(category)',
                'filterOnly(categorySlug)',
                'filterOnly(condition)',
                'filterOnly(sellerVerified)',
                'filterOnly(kycVerified)',
                'filterOnly(treuhandAvailable)',
                'filterOnly(plz)',
            ],
            ranking: [
                'typo',
                'geo',
                'words',
                'filters',
                'proximity',
                'attribute',
                'exact',
                'custom',
            ],
            customRanking: ['desc(postedAtTimestamp)', 'desc(sellerRating)'],
            numericAttributesForFiltering: ['price', 'sellerRating', 'postedAtTimestamp'],
        },
    });
}

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * Search listings — to be called from the API route, not directly from client
 */
export async function searchListings(query: string, filters: SearchFilters = {}) {
    const facetFilters: string[][] = [];
    const numericFilters: string[] = [];

    if (filters.kategorie) facetFilters.push([`categorySlug:${filters.kategorie}`]);
    if (filters.zustand) facetFilters.push([`condition:${filters.zustand}`]);
    if (filters.nurVerfiziert) facetFilters.push(['kycVerified:true']);
    if (filters.nurTreuhand) facetFilters.push(['treuhandAvailable:true']);
    if (filters.minPreis !== undefined) numericFilters.push(`price >= ${filters.minPreis}`);
    if (filters.maxPreis !== undefined) numericFilters.push(`price <= ${filters.maxPreis}`);

    // Sort index replica selection
    const indexName =
        filters.sortBy === 'price_asc'
            ? `${INDEX_NAME}_price_asc`
            : filters.sortBy === 'price_desc'
                ? `${INDEX_NAME}_price_desc`
                : filters.sortBy === 'newest'
                    ? `${INDEX_NAME}_newest`
                    : INDEX_NAME;

    const results = await adminClient.searchSingleIndex({
        indexName,
        searchParams: {
            query,
            facetFilters: facetFilters.length ? facetFilters : undefined,
            numericFilters: numericFilters.length ? numericFilters : undefined,
            page: filters.page ?? 0,
            hitsPerPage: filters.hitsPerPage ?? 20,
            attributesToRetrieve: [
                'objectID', 'title', 'price', 'image', 'location',
                'category', 'condition', 'sellerName', 'sellerRating',
                'sellerVerified', 'kycVerified', 'treuhandAvailable', 'postedAt',
            ],
        },
    });

    return {
        hits: results.hits,
        totalHits: results.nbHits ?? 0,
        pages: results.nbPages ?? 1,
        currentPage: results.page ?? 0,
        query,
    };
}
