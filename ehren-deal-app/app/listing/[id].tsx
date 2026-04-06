import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Heart,
  MoreHorizontal,
  MapPin,
  Truck,
  Package,
  Calendar,
  ChevronDown,
  ChevronUp,
  Star,
  Flag,
  MessageCircle,
  Handshake,
  ShieldCheck,
} from 'lucide-react-native';
import { Share } from 'react-native';
import { listingService, favoriteService, conversationService } from '@/services';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme';
import { formatPrice, formatRelativeDate, formatMemberSince } from '@/utils/format';
import { Avatar } from '@/components/ui';
import ImageGallery from '@/components/listing/ImageGallery';
import ListingCard from '@/components/listing/ListingCard';
import type { ListingWithImages, TrustLevel } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONDITION_LABELS: Record<string, string> = {
  NEW: 'Neu',
  LIKE_NEW: 'Wie neu',
  GOOD: 'Gut',
  FAIR: 'Akzeptabel',
  POOR: 'Defekt',
};

const PRICE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  FIXED: { label: 'Festpreis', color: colors.primary[600] },
  NEGOTIABLE: { label: 'VB', color: colors.warning[600] },
  FREE: { label: 'Zu verschenken', color: colors.success[600] },
  TRADE: { label: 'Tausch', color: colors.neutral[600] },
};

function mapTrustLevelKey(level: TrustLevel): 'new' | 'confirmed' | 'verified' | 'trusted' | 'identified' {
  const map: Record<TrustLevel, 'new' | 'confirmed' | 'verified' | 'trusted' | 'identified'> = {
    NEW: 'new',
    CONFIRMED: 'confirmed',
    VERIFIED: 'verified',
    TRUSTED: 'trusted',
    IDENTIFIED: 'identified',
  };
  return map[level] || 'new';
}

// ─── Listing Detail Screen ────────────────────────────────────────────────────

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [descriptionNeedsExpand, setDescriptionNeedsExpand] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const listingQuery = useQuery<ListingWithImages>({
    queryKey: ['listing', id],
    queryFn: () => listingService.getListing(id!),
    enabled: !!id,
  });

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorited) {
        await favoriteService.removeFavorite(id!);
      } else {
        await favoriteService.addFavorite(id!);
      }
    },
    onMutate: () => {
      setIsFavorited((prev) => !prev);
    },
    onError: () => {
      setIsFavorited((prev) => !prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const listing = listingQuery.data;

  // Aehnliche Inserate (gleiche Kategorie)
  const similarQuery = useQuery<any>({
    queryKey: ['listings', 'similar', listing?.categoryId],
    queryFn: () =>
      listingService.getListings({
        categoryId: listing!.categoryId,
        limit: 6,
      }),
    enabled: !!listing?.categoryId,
  });
  const similarListings: ListingWithImages[] = (similarQuery.data?.listings ?? similarQuery.data ?? [])
    .filter((l: any) => l.id !== id)
    .slice(0, 4);

  const handleShare = useCallback(async () => {
    if (!listing) return;
    try {
      await Share.share({
        message: `${listing.title} - ${formatPrice(listing.price)} auf Ehren-Deal\nhttps://ehren-deal.de/inserat/${listing.id}`,
      });
    } catch {}
  }, [listing]);

  const handleContact = useCallback(async () => {
    if (!listing) return;
    try {
      const conv = await conversationService.getOrCreateConversation(listing.id);
      router.push(`/chat/${conv.id}`);
    } catch {
      Alert.alert('Fehler', 'Konversation konnte nicht gestartet werden.');
    }
  }, [listing, router]);

  const handleReport = useCallback(() => {
    setShowMoreMenu(false);
    if (listing) {
      router.push({
        pathname: '/report',
        params: { targetType: 'LISTING', targetId: listing.id },
      });
    }
  }, [listing, router]);

  if (listingQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <ArrowLeft size={24} color={colors.neutral[900]} />
          </Pressable>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={typography.body}>Inserat nicht gefunden</Text>
        </View>
      </SafeAreaView>
    );
  }

  const priceConfig = PRICE_TYPE_LABELS[listing.priceType] ?? PRICE_TYPE_LABELS.FIXED;
  const conditionLabel = CONDITION_LABELS[listing.condition] ?? listing.condition;
  const seller = listing.seller;
  const trustKey = seller ? mapTrustLevelKey(seller.trustLevel) : 'new';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ─── Header ───────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <ArrowLeft size={24} color={colors.neutral[900]} />
        </Pressable>

        <View style={styles.headerRight}>
          <Pressable
            onPress={() => favoriteMutation.mutate()}
            style={styles.headerButton}
          >
            <Heart
              size={22}
              color={isFavorited ? colors.error[500] : colors.neutral[700]}
              fill={isFavorited ? colors.error[500] : 'transparent'}
            />
          </Pressable>

          <Pressable
            onPress={() => setShowMoreMenu(true)}
            style={styles.headerButton}
          >
            <MoreHorizontal size={22} color={colors.neutral[700]} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── Image Gallery ─────────────────────────────────────── */}
        <ImageGallery
          images={listing.images.map((img) => ({
            url: img.url,
            position: img.position,
          }))}
          height={320}
        />

        {/* ─── Title & Price ─────────────────────────────────────── */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{listing.title}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {listing.priceType === 'FREE'
                ? 'Zu verschenken'
                : formatPrice(listing.price)}
            </Text>

            <View
              style={[
                styles.priceTypeBadge,
                { borderColor: priceConfig.color },
              ]}
            >
              <Text style={[styles.priceTypeText, { color: priceConfig.color }]}>
                {priceConfig.label}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── Facts Block ───────────────────────────────────────── */}
        <View style={styles.factsCard}>
          <View style={styles.factRow}>
            <MapPin size={16} color={colors.neutral[500]} />
            <Text style={styles.factText}>{listing.city}</Text>
          </View>

          <View style={styles.factRow}>
            <Package size={16} color={colors.neutral[500]} />
            <Text style={styles.factText}>{conditionLabel}</Text>
          </View>

          <View style={styles.factRow}>
            <Truck size={16} color={colors.neutral[500]} />
            <Text style={styles.factText}>
              {listing.shippingAvailable && listing.pickupAvailable
                ? 'Versand & Abholung'
                : listing.shippingAvailable
                  ? 'Nur Versand'
                  : listing.pickupAvailable
                    ? 'Nur Abholung'
                    : 'Keine Angabe'}
            </Text>
          </View>

          <View style={styles.factRow}>
            <Calendar size={16} color={colors.neutral[500]} />
            <Text style={styles.factText}>
              {formatRelativeDate(listing.createdAt)}
            </Text>
          </View>
        </View>

        {/* ─── Description ───────────────────────────────────────── */}
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>Beschreibung</Text>
          <Text
            style={styles.descriptionText}
            numberOfLines={descriptionExpanded ? undefined : 4}
            onTextLayout={(e) => {
              if (e.nativeEvent.lines.length > 4) {
                setDescriptionNeedsExpand(true);
              }
            }}
          >
            {listing.description || 'Keine Beschreibung vorhanden.'}
          </Text>

          {descriptionNeedsExpand && (
            <Pressable
              onPress={() => setDescriptionExpanded(!descriptionExpanded)}
              style={styles.expandButton}
            >
              <Text style={styles.expandText}>
                {descriptionExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
              </Text>
              {descriptionExpanded ? (
                <ChevronUp size={16} color={colors.primary[500]} />
              ) : (
                <ChevronDown size={16} color={colors.primary[500]} />
              )}
            </Pressable>
          )}
        </View>

        {/* ─── Seller Card ───────────────────────────────────────── */}
        {seller && (
          <View style={styles.sellerCard}>
            <Text style={styles.sectionTitle}>Verkaeufer</Text>

            <Pressable
              style={styles.sellerRow}
              onPress={() => router.push(`/user/${seller.userId}`)}
            >
              <Avatar
                uri={seller.avatarUrl}
                size="lg"
                trustLevel={trustKey}
                name={seller.displayName}
              />

              <View style={styles.sellerInfo}>
                <View style={styles.sellerNameRow}>
                  <Text style={styles.sellerName}>{seller.displayName}</Text>
                  {(seller.trustLevel === 'VERIFIED' ||
                    seller.trustLevel === 'TRUSTED') && (
                    <ShieldCheck size={16} color={colors.trustVerified} />
                  )}
                </View>

                {seller.avgRating > 0 && (
                  <View style={styles.ratingRow}>
                    <Star
                      size={14}
                      color={colors.warning[500]}
                      fill={colors.warning[500]}
                    />
                    <Text style={styles.ratingText}>
                      {seller.avgRating.toFixed(1)}
                    </Text>
                    <Text style={styles.ratingSubtext}>
                      ({seller.totalDeals} Deals)
                    </Text>
                  </View>
                )}

                <Text style={styles.memberSince}>
                  Mitglied seit {formatMemberSince(seller.createdAt)}
                </Text>

                <Text style={styles.profileLink}>Profil ansehen</Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* Aehnliche Inserate */}
        {similarListings.length > 0 && (
          <View style={styles.similarSection}>
            <Text style={styles.similarTitle}>Aehnliche Inserate</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.similarRow}>
                {similarListings.map((item) => (
                  <View key={item.id} style={styles.similarCard}>
                    <ListingCard
                      listing={item}
                      compact
                      onPress={() => router.push(`/listing/${item.id}`)}
                    />
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Spacer for bottom bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ─── Bottom CTA Bar ──────────────────────────────────────── */}
      <View style={styles.bottomBar}>
        <Pressable
          style={styles.ctaSecondary}
          onPress={handleContact}
        >
          <MessageCircle size={18} color={colors.primary[500]} />
          <Text style={styles.ctaSecondaryText}>Nachricht</Text>
        </Pressable>

        <Pressable
          style={styles.ctaPrimary}
          onPress={() => {
            router.push(`/deal/${listing.id}`);
          }}
        >
          <Handshake size={18} color={colors.white} />
          <Text style={styles.ctaPrimaryText}>Deal vorschlagen</Text>
        </Pressable>
      </View>

      {/* ─── More Menu Modal ─────────────────────────────────────── */}
      <Modal
        visible={showMoreMenu}
        animationType="fade"
        transparent
        onRequestClose={() => setShowMoreMenu(false)}
      >
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setShowMoreMenu(false)}
        >
          <View style={styles.menuContent}>
            <Pressable style={styles.menuItem} onPress={() => { setShowMoreMenu(false); handleShare(); }}>
              <Text style={styles.menuItemText}>Teilen</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={handleReport}>
              <Flag size={18} color={colors.error[500]} />
              <Text style={[styles.menuItemText, { color: colors.error[500] }]}>Melden</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
    zIndex: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },

  // Title & Price
  titleSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  priceTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  priceTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Facts
  factsCard: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  factText: {
    ...typography.body,
    flex: 1,
  },

  // Description
  descriptionSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  descriptionText: {
    ...typography.body,
    lineHeight: 22,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  expandText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[500],
  },

  // Seller
  sellerCard: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  sellerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  sellerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sellerName: {
    ...typography.h3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  ratingSubtext: {
    fontSize: 13,
    color: colors.neutral[500],
  },
  memberSince: {
    ...typography.caption,
    marginBottom: 6,
  },
  profileLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[500],
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: 34,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 4,
  },
  ctaSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 50,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: colors.primary[500],
    backgroundColor: colors.surface,
  },
  ctaSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary[500],
  },
  ctaPrimary: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 50,
    borderRadius: radius.button,
    backgroundColor: colors.primary[500],
  },
  ctaPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },

  // More Menu
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.sm,
    width: 200,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.neutral[900],
  },

  // Aehnliche Inserate
  similarSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  similarTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  similarRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  similarCard: {
    width: 170,
  },
});
