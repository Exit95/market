import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  RefreshControl,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Heart } from 'lucide-react-native';
import { favoriteService, listingService } from '@/services';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme';
import type { ListingWithImages, Favorite } from '@/types';
import ListingCard from '@/components/listing/ListingCard';

export default function FavoritesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const favoritesQuery = useQuery<ListingWithImages[]>({
    queryKey: ['favorites'],
    queryFn: async () => {
      const favorites = await favoriteService.getFavorites();
      return favorites;
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: (listingId: string) => favoriteService.removeFavorite(listingId),
    onMutate: async (listingId) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] });

      const previousFavorites = queryClient.getQueryData<ListingWithImages[]>([
        'favorites',
      ]);

      queryClient.setQueryData<ListingWithImages[]>(
        ['favorites'],
        (old) => old?.filter((item) => item.id !== listingId) ?? [],
      );

      return { previousFavorites };
    },
    onError: (_err, _listingId, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(['favorites'], context.previousFavorites);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['favorites'] });
    setRefreshing(false);
  }, [queryClient]);

  const handleFavoriteToggle = useCallback(
    (listingId: string) => {
      removeFavoriteMutation.mutate(listingId);
    },
    [removeFavoriteMutation],
  );

  const favorites = favoritesQuery.data ?? [];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.neutral[900]} />
        </Pressable>
        <Text style={styles.headerTitle}>Merkliste</Text>
        <View style={{ width: 40 }} />
      </View>

      {favoritesQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Heart size={40} color={colors.neutral[300]} />
          </View>
          <Text style={styles.emptyTitle}>Noch keine Favoriten</Text>
          <Text style={styles.emptySubtitle}>
            Speichere Inserate, die dir gefallen, um sie hier
            wiederzufinden.
          </Text>

          <Pressable
            style={styles.ctaButton}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={styles.ctaButtonText}>Inserate entdecken</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary[500]}
              colors={[colors.primary[500]]}
            />
          }
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              onPress={() => router.push(`/listing/${item.id}`)}
              isFavorited
              onFavoriteToggle={handleFavoriteToggle}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  ctaButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: radius.button,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});
