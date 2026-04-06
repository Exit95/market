// ─── Enum types (matching Prisma enums) ─────────────────────────────────────

export type UserRole = 'USER' | 'MODERATOR' | 'ADMIN';

export type TrustLevel = 'NEW' | 'CONFIRMED' | 'VERIFIED' | 'TRUSTED' | 'IDENTIFIED';

export type ListingCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'ACCEPTABLE' | 'DEFECTIVE';

export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'RESERVED' | 'SOLD' | 'DEACTIVATED' | 'DELETED';

export type PriceType = 'FIXED' | 'NEGOTIABLE' | 'FREE';

export type DealStatus =
  | 'INQUIRY'
  | 'NEGOTIATING'
  | 'RESERVED'
  | 'AGREED'
  | 'PAID'
  | 'SHIPPED'
  | 'HANDED_OVER'
  | 'COMPLETED'
  | 'CANCELED'
  | 'CONFLICT';

export type DealType = 'PICKUP' | 'SHIPPING' | 'DIGITAL';

export type MessageType = 'TEXT' | 'IMAGE' | 'SYSTEM' | 'DEAL_ACTION';

export type ReportTargetType = 'USER' | 'LISTING' | 'REVIEW' | 'MESSAGE';

export type ReportReason =
  | 'SCAM'
  | 'FAKE'
  | 'OFFENSIVE'
  | 'PROHIBITED'
  | 'MISLEADING'
  | 'DUPLICATE'
  | 'HARASSMENT'
  | 'SPAM'
  | 'OTHER';

export type ReportStatus = 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';

export type VerificationType = 'EMAIL' | 'PHONE' | 'IDENTITY';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

export type NotificationType =
  | 'MESSAGE'
  | 'DEAL_UPDATE'
  | 'REVIEW'
  | 'LISTING_UPDATE'
  | 'SYSTEM'
  | 'MODERATION';

// ─── Entity interfaces (matching API / Prisma models) ───────────────────────

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  city: string;
  postalCode: string | null;
  locationLat: number | null;
  locationLng: number | null;
  trustLevel: TrustLevel;
  avgRating: number;
  totalDeals: number;
  responseTimeMinutes: number | null;
  isBlocked: boolean;
  blockedReason: string | null;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Listing {
  id: string;
  sellerId: string;
  categoryId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  priceType: PriceType;
  condition: ListingCondition;
  city: string;
  postalCode: string | null;
  locationLat: number | null;
  locationLng: number | null;
  shippingAvailable: boolean;
  pickupAvailable: boolean;
  status: ListingStatus;
  viewCount: number;
  aiQualityScore: number | null;
  aiRiskScore: number | null;
  aiSuggestions: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListingImage {
  id: string;
  listingId: string;
  url: string;
  position: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface Favorite {
  id: string;
  userId: string;
  listingId: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  dealId: string | null;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  messageType: MessageType;
  metadata: Record<string, any> | null;
  readAt: string | null;
  createdAt: string;
}

export interface Deal {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  conversationId: string;
  status: DealStatus;
  dealType: DealType;
  agreedPrice: number;
  trackingNumber: string | null;
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
  completedAt: string | null;
  canceledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DealStatusHistory {
  id: string;
  dealId: string;
  oldStatus: DealStatus | null;
  newStatus: DealStatus;
  changedById: string;
  note: string | null;
  createdAt: string;
}

export interface Review {
  id: string;
  dealId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  text: string | null;
  visibleAt: string | null;
  isRemoved: boolean;
  removedReason: string | null;
  removedById: string | null;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, any> | null;
  readAt: string | null;
  createdAt: string;
}

export interface Verification {
  id: string;
  userId: string;
  type: VerificationType;
  status: VerificationStatus;
  verifiedAt: string | null;
  expiresAt: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlockedUser {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

// ─── Composite types for common API responses ───────────────────────────────

export interface ListingWithImages extends Listing {
  images: ListingImage[];
  seller: Profile;
}

export interface ConversationWithDetails extends Conversation {
  listing: Listing & { images: ListingImage[] };
  otherUser: Profile;
  lastMessage?: Message;
}

export interface DealWithDetails extends Deal {
  listing: Listing & { images: ListingImage[] };
  otherUser: Profile;
  buyer?: Profile;
  seller?: Profile;
  statusHistory: DealStatusHistory[];
  reviews?: Review[];
}

export interface ReviewWithUsers extends Review {
  reviewer: Profile;
  reviewee: Profile;
}
