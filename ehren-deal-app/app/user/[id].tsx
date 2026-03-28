import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MessageSquare,
  Flag,
  Star,
  ChevronRight,
} from 'lucide-react-native';
import {
  profileService,
  reviewService,
  listingService,
  conversationService,
} from '@/services';
import ProfileHeader from '@/components/profile/ProfileHeader';
import Card from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { LoadingState, ErrorState } from '@/components/layout';
import { colors, spacing } from '@/theme';
import { formatPrice, formatRelativeDate } from '@/utils/format';
import type {
  Profile,
  ListingWithImages,
  ReviewWithUsers,
} from '@/types';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    refetch: refetchProfile,
  } = useQuery<Profile>({
    queryKey: ['profile', id],
    queryFn: () => profileService.getProfile(id!),
    enabled: !!id,
  });

  const { data: reviews } = useQuery<ReviewWithUsers[]>({
    queryKey: ['user-reviews', id],
    queryFn: () => reviewService.getUserReviews(id!),
    enabled: !!id,
  });

  const { data: listings } = useQuery<ListingWithImages[]>({
    queryKey: ['user-listings', id],
    queryFn: () =>
      listingService.getListings({ sellerId: id } as any),
    enabled: !!id,
  });

  const handleMessage = useCallback(async () => {
    // Conversation ueber erstes aktives Listing dieses Nutzers starten
    if (listings && listings.length > 0) {
      try {
        const conv = await conversationService.getOrCreateConversation(listings[0].id);
        router.push(`/chat/${conv.id}`);
      } catch {
        router.push(`/listing/${listings[0].id}`);
      }
    }
  }, [listings, router]);

  const handleReport = useCallback(() => {
    router.push({
      pathname: '/report',
      params: { targetType: 'USER', targetId: id },
    });
  }, [id, router]);

  if (profileLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingState message="Profil wird geladen..." />
      </SafeAreaView>
    );
  }

  if (profileError || !profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
          >
            <ArrowLeft size={22} color={colors.neutral[900]} />
          </Pressable>
        </View>
        <ErrorState
          message="Profil konnte nicht geladen werden."
          onRetry={refetchProfile}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Zurueck"
        >
          <ArrowLeft size={22} color={colors.neutral[900]} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {profile.displayName}
        </Text>
        <Pressable
          onPress={handleReport}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => [
            styles.reportBtn,
            pressed && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Melden"
        >
          <Flag size={20} color={colors.neutral[500]} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Profile Header */}
        <ProfileHeader
          profile={{
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            trustLevel: profile.trustLevel,
            avgRating: profile.avgRating,
            totalDeals: profile.totalDeals,
            createdAt: profile.createdAt,
          }}
          isOwn={false}
        />

        {/* Message Button */}
        <View style={styles.actionRow}>
          <Button
            variant="primary"
            fullWidth
            onPress={handleMessage}
          >
            <View style={styles.btnContent}>
              <MessageSquare size={18} color={colors.white} />
              <Text style={styles.btnText}>Nachricht schreiben</Text>
            </View>
          </Button>
        </View>

        {/* Active Listings */}
        {listings && listings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Aktive Inserate ({listings.length})
            </Text>
            <FlatList
              data={listings}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listingsScroll}
              renderItem={({ item }) => (
                <Card
                  style={styles.listingCard}
                  onPress={() => router.push(`/listing/${item.id}`)}
                >
                  <View style={styles.listingImagePlaceholder}>
                    {item.images[0]?.url ? (
                      <View style={styles.listingImg}>
                        <Text style={styles.listingImgText}>
                          {item.title.charAt(0)}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.listingImg}>
                        <Text style={styles.listingImgText}>
                          {item.title.charAt(0)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.listingName} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.listingPriceText}>
                    {formatPrice(item.price)}
                  </Text>
                </Card>
              )}
            />
          </View>
        )}

        {/* Reviews */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Bewertungen{' '}
            {reviews ? `(${reviews.length})` : ''}
          </Text>

          {(!reviews || reviews.length === 0) && (
            <Text style={styles.emptyText}>
              Noch keine Bewertungen vorhanden.
            </Text>
          )}

          {reviews?.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Avatar
                  uri={review.reviewer.avatarUrl}
                  size="sm"
                  name={review.reviewer.displayName}
                />
                <View style={styles.reviewMeta}>
                  <Text style={styles.reviewerName}>
                    {review.reviewer.displayName}
                  </Text>
                  <View style={styles.reviewStarsRow}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        color={
                          i < review.rating
                            ? colors.warning[500]
                            : colors.neutral[300]
                        }
                        fill={
                          i < review.rating
                            ? colors.warning[500]
                            : 'transparent'
                        }
                      />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewDate}>
                  {formatRelativeDate(review.createdAt)}
                </Text>
              </View>
              {review.text && (
                <Text style={styles.reviewText}>{review.text}</Text>
              )}
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.background,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: colors.neutral[900],
    textAlign: 'center',
  },
  reportBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingBottom: 24,
  },
  actionRow: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 12,
  },
  listingsScroll: {
    gap: 12,
  },
  listingCard: {
    width: 150,
    padding: 10,
  },
  listingImagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  listingImg: {
    flex: 1,
    backgroundColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingImgText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral[400],
  },
  listingName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.neutral[900],
    lineHeight: 18,
  },
  listingPriceText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary[600],
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: colors.neutral[400],
    textAlign: 'center',
    paddingVertical: 24,
  },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewMeta: {
    flex: 1,
    marginLeft: 10,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  reviewStarsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: colors.neutral[400],
  },
  reviewText: {
    fontSize: 14,
    color: colors.neutral[700],
    lineHeight: 20,
    marginTop: 10,
  },
});
