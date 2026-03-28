import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Heart, Truck, MapPin, ShieldCheck } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme';
import { formatPrice } from '@/utils/format';
import type { ListingWithImages, TrustLevel } from '@/types';

interface ListingCardProps {
  listing: ListingWithImages;
  onPress?: () => void;
  compact?: boolean;
  onFavoriteToggle?: (listingId: string) => void;
  isFavorited?: boolean;
}

const COMPACT_WIDTH = 180;
const COMPACT_IMAGE_HEIGHT = 140;
const FULL_IMAGE_HEIGHT = 200;

const CONDITION_LABELS: Record<string, string> = {
  NEW: 'Neu',
  LIKE_NEW: 'Wie neu',
  GOOD: 'Gut',
  FAIR: 'Akzeptabel',
  POOR: 'Defekt',
};

function mapTrustLevel(level: TrustLevel): string {
  const map: Record<TrustLevel, string> = {
    NEW: 'new',
    CONFIRMED: 'confirmed',
    VERIFIED: 'verified',
    TRUSTED: 'trusted',
    IDENTIFIED: 'identified',
  };
  return map[level] || 'new';
}

export default function ListingCard({
  listing,
  onPress,
  compact = false,
  onFavoriteToggle,
  isFavorited = false,
}: ListingCardProps) {
  const imageUrl = listing.images?.[0]?.url;
  const conditionLabel = CONDITION_LABELS[listing.condition] || listing.condition;
  const isVerified =
    listing.seller?.trustLevel === 'VERIFIED' ||
    listing.seller?.trustLevel === 'TRUSTED';

  const priceLabel =
    listing.priceType === 'FREE'
      ? 'Zu verschenken'
      : formatPrice(listing.price);

  const priceSubLabel =
    listing.priceType === 'NEGOTIABLE' ? 'VB' : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact ? styles.cardCompact : styles.cardFull,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
    >
      <View
        style={[
          styles.imageContainer,
          {
            height: compact ? COMPACT_IMAGE_HEIGHT : FULL_IMAGE_HEIGHT,
          },
        ]}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>Kein Bild</Text>
          </View>
        )}

        {onFavoriteToggle && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onFavoriteToggle(listing.id);
            }}
            style={styles.favoriteButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Heart
              size={18}
              color={isFavorited ? colors.error[500] : colors.white}
              fill={isFavorited ? colors.error[500] : 'transparent'}
            />
          </Pressable>
        )}

        {isVerified && (
          <View style={styles.trustBadge}>
            <ShieldCheck size={12} color={colors.trustVerified} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text
          style={[
            compact ? styles.titleCompact : styles.titleFull,
          ]}
          numberOfLines={2}
        >
          {listing.title}
        </Text>

        <View style={styles.priceRow}>
          <Text style={compact ? styles.priceCompact : styles.priceFull}>
            {priceLabel}
          </Text>
          {priceSubLabel && (
            <Text style={styles.priceType}> {priceSubLabel}</Text>
          )}
        </View>

        <View style={styles.metaRow}>
          <MapPin size={12} color={colors.neutral[400]} />
          <Text style={styles.metaText} numberOfLines={1}>
            {listing.city}
          </Text>
        </View>

        {!compact && (
          <View style={styles.badgeRow}>
            <View style={styles.conditionChip}>
              <Text style={styles.conditionText}>{conditionLabel}</Text>
            </View>

            {listing.shippingAvailable && (
              <View style={styles.shippingBadge}>
                <Truck size={11} color={colors.primary[600]} />
                <Text style={styles.shippingText}>Versand</Text>
              </View>
            )}

            {listing.pickupAvailable && (
              <View style={styles.shippingBadge}>
                <MapPin size={11} color={colors.success[600]} />
                <Text style={[styles.shippingText, { color: colors.success[600] }]}>
                  Abholung
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardCompact: {
    width: COMPACT_WIDTH,
    marginRight: spacing.sm,
  },
  cardFull: {
    width: '100%',
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
  imageContainer: {
    width: '100%',
    position: 'relative',
    backgroundColor: colors.neutral[100],
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[200],
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: colors.neutral[400],
  },
  favoriteButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    padding: spacing.sm,
  },
  titleCompact: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[900],
    lineHeight: 18,
    marginBottom: 4,
  },
  titleFull: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
    lineHeight: 20,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  priceCompact: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  priceFull: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  priceType: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.neutral[500],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.neutral[500],
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  conditionChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.neutral[100],
  },
  conditionText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.neutral[600],
  },
  shippingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.primary[50],
  },
  shippingText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.primary[600],
  },
});
