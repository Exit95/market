import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  FlatList,
  RefreshControl,
  Pressable,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react-native';
import { listingService, categoryService } from '@/services';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme';
import type { ListingWithImages, Category } from '@/types';
import ListingCard from '@/components/listing/ListingCard';

// ─── Skeleton Placeholder ─────────────────────────────────────────────────────

function SkeletonCard({ compact }: { compact?: boolean }) {
  return (
    <View
      style={[
        skeletonStyles.card,
        compact ? skeletonStyles.cardCompact : skeletonStyles.cardFull,
      ]}
    >
      <View
        style={[
          skeletonStyles.imageSkeleton,
          { height: compact ? 140 : 200 },
        ]}
      />
      <View style={skeletonStyles.content}>
        <View style={skeletonStyles.titleSkeleton} />
        <View style={skeletonStyles.priceSkeleton} />
        <View style={skeletonStyles.metaSkeleton} />
      </View>
    </View>
  );
}

function SkeletonRow() {
  return (
    <View style={skeletonStyles.row}>
      {[1, 2, 3].map((i) => (
        <SkeletonCard key={i} compact />
      ))}
    </View>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const categoriesQuery = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
  });

  const nearbyQuery = useQuery<ListingWithImages[]>({
    queryKey: ['listings', 'nearby'],
    queryFn: () =>
      listingService.getListings({ sortBy: 'newest', limit: 10 }),
  });

  const verifiedQuery = useQuery<ListingWithImages[]>({
    queryKey: ['listings', 'verified'],
    queryFn: () =>
      listingService.getListings({
        verifiedSeller: true,
        sortBy: 'newest',
        limit: 10,
      }),
  });

  const trendingQuery = useQuery<ListingWithImages[]>({
    queryKey: ['listings', 'trending'],
    queryFn: () =>
      listingService.getListings({
        sortBy: 'popular' as any,
        limit: 10,
      }),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['listings'] });
    await queryClient.invalidateQueries({ queryKey: ['categories'] });
    setRefreshing(false);
  }, [queryClient]);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const isLoading =
    nearbyQuery.isLoading || verifiedQuery.isLoading || categoriesQuery.isLoading;

  const renderListingCard = useCallback(
    ({ item }: { item: ListingWithImages }) => (
      <ListingCard
        listing={item}
        compact
        onPress={() => router.push(`/listing/${item.id}`)}
      />
    ),
    [router],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
          />
        }
      >
        {/* Search Bar */}
        <Pressable
          style={styles.searchBar}
          onPress={() => router.push('/(tabs)/search')}
          accessibilityRole="button"
          accessibilityLabel="Suche oeffnen"
        >
          <Search size={20} color={colors.neutral[400]} />
          <Text style={styles.searchPlaceholder}>
            Was suchst du?
          </Text>
        </Pressable>

        {/* Category Pills */}
        {categoriesQuery.isLoading ? (
          <View style={styles.categoryLoading}>
            <ActivityIndicator size="small" color={colors.primary[500]} />
          </View>
        ) : (
          <FlatList
            data={categoriesQuery.data ?? []}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  setSelectedCategory(
                    selectedCategory === item.id ? null : item.id,
                  )
                }
                style={[
                  styles.categoryPill,
                  selectedCategory === item.id && styles.categoryPillSelected,
                ]}
              >
                {item.icon ? (
                  <Text style={styles.categoryIcon}>{item.icon}</Text>
                ) : null}
                <Text
                  style={[
                    styles.categoryLabel,
                    selectedCategory === item.id &&
                      styles.categoryLabelSelected,
                  ]}
                >
                  {item.name}
                </Text>
              </Pressable>
            )}
          />
        )}

        {/* Neu in deiner Naehe */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Neu in deiner Naehe</Text>

          {nearbyQuery.isLoading ? (
            <SkeletonRow />
          ) : nearbyQuery.data && nearbyQuery.data.length > 0 ? (
            <FlatList
              data={nearbyQuery.data}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              keyExtractor={(item) => item.id}
              renderItem={renderListingCard}
            />
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>
                Noch keine Inserate in deiner Naehe
              </Text>
            </View>
          )}
        </View>

        {/* Beliebt */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Beliebt</Text>

          {trendingQuery.isLoading ? (
            <SkeletonRow />
          ) : trendingQuery.data && trendingQuery.data.length > 0 ? (
            <FlatList
              data={trendingQuery.data}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              keyExtractor={(item) => item.id}
              renderItem={renderListingCard}
            />
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>
                Noch keine beliebten Inserate
              </Text>
            </View>
          )}
        </View>

        {/* Von verifizierten Nutzern */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Von verifizierten Nutzern</Text>

          {verifiedQuery.isLoading ? (
            <SkeletonRow />
          ) : verifiedQuery.data && verifiedQuery.data.length > 0 ? (
            <FlatList
              data={verifiedQuery.data}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              keyExtractor={(item) => item.id}
              renderItem={renderListingCard}
            />
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>
                Keine verifizierten Inserate gefunden
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 48,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    gap: spacing.sm,
  },
  searchPlaceholder: {
    fontSize: 15,
    color: colors.neutral[400],
    flex: 1,
  },
  categoryLoading: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    backgroundColor: colors.surface,
    gap: 6,
  },
  categoryPillSelected: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.neutral[600],
  },
  categoryLabelSelected: {
    color: colors.white,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h2,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  horizontalList: {
    paddingHorizontal: spacing.md,
  },
  emptySection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: 14,
    color: colors.neutral[400],
  },
});

const skeletonStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  cardCompact: {
    width: 180,
  },
  cardFull: {
    width: '100%',
  },
  imageSkeleton: {
    width: '100%',
    backgroundColor: colors.neutral[200],
  },
  content: {
    padding: spacing.sm,
    gap: 6,
  },
  titleSkeleton: {
    width: '80%',
    height: 14,
    borderRadius: 4,
    backgroundColor: colors.neutral[200],
  },
  priceSkeleton: {
    width: '40%',
    height: 16,
    borderRadius: 4,
    backgroundColor: colors.neutral[200],
  },
  metaSkeleton: {
    width: '60%',
    height: 12,
    borderRadius: 4,
    backgroundColor: colors.neutral[200],
  },
});
