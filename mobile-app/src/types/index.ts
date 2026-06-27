export type DealStatus = 'PENDING' | 'PAYMENT_PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED' | 'DISPUTED';
export type TrustLevel = 'NEW' | 'BASIC' | 'VERIFIED' | 'TRUSTED' | 'ELITE';

export interface User {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    city?: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    idVerified: boolean;
    role: 'USER' | 'ADMIN';
    trustScore?: { score: number; level: TrustLevel };
}

export interface Listing {
    id: string;
    title: string;
    description: string;
    price: number; // in Cent
    category: string;
    subcategoryId?: string;
    city: string;
    postalCode: string;
    condition?: string;
    treuhand: boolean;
    status: string;
    viewCount: number;
    images: { id: string; url: string }[];
    seller: {
        id: string;
        firstName?: string;
        lastName?: string;
        idVerified: boolean;
        trustScore?: { score: number; level: TrustLevel };
    };
    createdAt: string;
}

export interface Deal {
    id: string;
    listingId: string;
    listing: { title: string; images: { url: string }[] };
    buyerId: string;
    sellerId: string;
    buyer: { firstName?: string; lastName?: string };
    seller: { firstName?: string; lastName?: string };
    status: DealStatus;
    totalAmount: number;
    trackingCode?: string;
    carrier?: string;
    createdAt: string;
    completedAt?: string;
}

export interface Conversation {
    id: string;
    listing: { id: string; title: string; price: number; images: { url: string }[] };
    buyer: User;
    seller: User;
    buyerId: string;
    sellerId: string;
    messages: Message[];
}

export interface Message {
    id?: string;
    body: string;
    senderId: string;
    createdAt: string;
}

// ── Leistungstausch Types ──

export type ServiceEffort = 'UNTER_1_STUNDE' | 'EIN_BIS_DREI_STUNDEN' | 'DREI_BIS_ACHT_STUNDEN' | 'MEHRERE_TAGE' | 'FORTLAUFEND';
export type ServiceLocationType = 'VOR_ORT' | 'REMOTE' | 'BEIDES';
export type ServiceListingStatus = 'ACTIVE' | 'PAUSED' | 'MATCHED' | 'COMPLETED' | 'EXPIRED' | 'REMOVED';
export type ServiceDealStatus = 'ACTIVE' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED';
export type ServiceProposalStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COUNTERED' | 'WITHDRAWN' | 'EXPIRED';

export interface ServiceCategory {
    id: string;
    name: string;
    slug: string;
    icon?: string;
    description?: string;
    listingCount: number;
}

export interface ServiceListing {
    id: string;
    title: string;
    offeredDescription: string;
    soughtDescription: string;
    effort: ServiceEffort;
    locationType: ServiceLocationType;
    city?: string;
    status: ServiceListingStatus;
    viewCount: number;
    offeredCategory: { id: string; name: string; slug: string };
    soughtCategories: Array<{ category: { id: string; name: string; slug: string } }>;
    user: {
        id: string;
        firstName?: string;
        lastName?: string;
        avatarUrl?: string;
        emailVerified: boolean;
        phoneVerified: boolean;
        idVerified: boolean;
    };
    images: Array<{ url: string }>;
    createdAt: string;
}

export interface ServiceProposal {
    id: string;
    offeredDescription: string;
    offeredEffort: ServiceEffort;
    soughtDescription: string;
    soughtEffort: ServiceEffort;
    locationType: ServiceLocationType;
    proposedLocation?: string;
    proposedTimeframe?: string;
    message?: string;
    status: ServiceProposalStatus;
    proposer: { id: string; firstName?: string; lastName?: string };
    createdAt: string;
}

export interface ServiceDeal {
    id: string;
    status: ServiceDealStatus;
    partyACompleted: boolean;
    partyBCompleted: boolean;
    cancelRequestedBy?: string;
    completedAt?: string;
    createdAt: string;
    partyA: { id: string; firstName?: string; lastName?: string };
    partyB: { id: string; firstName?: string; lastName?: string };
    proposal: {
        offeredDescription: string;
        offeredEffort: ServiceEffort;
        soughtDescription: string;
        soughtEffort: ServiceEffort;
        serviceListing: { id: string; title: string };
    };
}

export interface Category {
    id: string;
    slug: string;
    name: string;
    icon?: string;
    parentId?: string;
    children?: Category[];
    listingCount: number;
}
