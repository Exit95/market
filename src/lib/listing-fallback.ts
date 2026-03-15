import { listings as mockListings } from '../data/listings';

type ListingQuery = {
    query?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    city?: string;
    page: number;
    pageSize: number;
    status?: string;
};

const CATEGORY_TO_ENUM: Record<string, string> = {
    Elektronik: 'ELEKTRONIK',
    Fahrzeuge: 'FAHRZEUGE',
    'Mode & Kleidung': 'MODE',
    'Möbel & Wohnen': 'MOEBEL',
    'Sport & Freizeit': 'SPORT',
    Haushalt: 'HAUSHALT',
    'Bücher & Medien': 'BUCHER',
    Spielzeug: 'SPIELZEUG',
};

const sellerSince = new Date('2024-01-01T00:00:00.000Z').toISOString();

function toApiListing(listing: (typeof mockListings)[number], index: number) {
    const [firstName, ...rest] = listing.sellerName.split(' ');
    return {
        id: listing.id,
        title: listing.title,
        description: listing.description ?? '',
        price: listing.price * 100,
        currency: 'EUR',
        category: CATEGORY_TO_ENUM[listing.category] ?? 'SONSTIGES',
        city: listing.location,
        postalCode: '',
        status: 'ACTIVE',
        treuhand: listing.treuhandAvailable,
        condition: listing.condition,
        createdAt: new Date(Date.now() - index * 86_400_000).toISOString(),
        viewCount: 0,
        seller: {
            id: `mock-seller-${listing.id}`,
            firstName,
            lastName: rest.join(' ') || null,
            idVerified: listing.sellerKYC,
            emailVerified: listing.sellerVerified,
            createdAt: sellerSince,
            trustScore: {
                score: listing.sellerKYC ? 92 : 68,
                level: listing.sellerKYC ? 'VERIFIED' : 'BASIC',
            },
        },
        images: listing.image ? [{ url: listing.image }] : [],
    };
}

function getAllFallbackListings() {
    return mockListings.map(toApiListing);
}

export function shouldUseListingFallback(error?: unknown) {
    if (!process.env.DATABASE_URL) return true;
    if (!(error instanceof Error)) return false;

    return [
        'Environment variable not found: DATABASE_URL',
        "Can't reach database server",
        'P1001',
    ].some((needle) => error.message.includes(needle));
}

export function getFallbackListings(query: ListingQuery) {
    const needle = query.query?.trim().toLowerCase();
    const cityNeedle = query.city?.trim().toLowerCase();

    let filtered = getAllFallbackListings().filter((listing) => {
        if (query.status && query.status !== 'ACTIVE') return false;
        if (query.category && listing.category !== query.category) return false;
        if (query.minPrice !== undefined && listing.price < query.minPrice) return false;
        if (query.maxPrice !== undefined && listing.price > query.maxPrice) return false;
        if (cityNeedle && !listing.city.toLowerCase().includes(cityNeedle)) return false;
        if (!needle) return true;

        return [listing.title, listing.description]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(needle));
    });

    const total = filtered.length;
    const start = (query.page - 1) * query.pageSize;
    filtered = filtered.slice(start, start + query.pageSize);

    return {
        listings: filtered,
        pagination: {
            total,
            page: query.page,
            pageSize: query.pageSize,
            totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
        },
    };
}

export function getFallbackListingById(id: string) {
    return getAllFallbackListings().find((listing) => listing.id === id) ?? null;
}