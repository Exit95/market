import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Package,
  Plus,
  MoreVertical,
  Eye,
  Edit3,
  Trash2,
  EyeOff,
} from 'lucide-react-native';
import { listingService } from '@/services';
import { useAuthStore } from '@/store/auth-store';
import ListingCard from '@/components/listing/ListingCard';
import { LoadingState, EmptyState } from '@/components/layout';
import { colors, spacing } from '@/theme';
import { formatPrice, formatRelativeDate } from '@/utils/format';
import type { ListingWithImages, ListingStatus } from '@/types';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Aktiv', color: colors.success[500] },
  DRAFT: { label: 'Entwurf', color: colors.neutral[400] },
  RESERVED: { label: 'Reserviert', color: colors.warning[500] },
  SOLD: { label: 'Verkauft', color: colors.primary[500] },
  DEACTIVATED: { label: 'Deaktiviert', color: colors.neutral[400] },
};

export default function MyListingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  const {
    data: response,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['my-listings'],
    queryFn: () => listingService.getListings({ sellerId: profile?.id } as any),
    enabled: !!profile,
  });

  const listings: ListingWithImages[] = response?.listings ?? response ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => listingService.deleteListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      listingService.updateListing(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
    },
  });

  const filteredListings = activeFilter === 'ALL'
    ? listings
    : listings.filter((l) => l.status === activeFilter);

  const handleOptions = useCallback(
    (listing: ListingWithImages) => {
      const actions: any[] = [
        {
          text: 'Bearbeiten',
          onPress: () => router.push({ pathname: '/edit-listing', params: { id: listing.id } }),
        },
      ];

      if (listing.status === 'ACTIVE') {
        actions.push({
          text: 'Deaktivieren',
          onPress: () =>
            toggleStatusMutation.mutate({ id: listing.id, status: 'DEACTIVATED' }),
        });
      } else if (listing.status === 'DEACTIVATED') {
        actions.push({
          text: 'Aktivieren',
          onPress: () =>
            toggleStatusMutation.mutate({ id: listing.id, status: 'ACTIVE' }),
        });
      }

      actions.push({
        text: 'Loeschen',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Inserat loeschen', 'Moechtest du dieses Inserat wirklich loeschen?', [
            { text: 'Abbrechen', style: 'cancel' },
            {
              text: 'Loeschen',
              style: 'destructive',
              onPress: () => deleteMutation.mutate(listing.id),
            },
          ]);
        },
      });

      actions.push({ text: 'Abbrechen', style: 'cancel' });

      Alert.alert(listing.title, undefined, actions);
    },
    [router, deleteMutation, toggleStatusMutation]
  );

  const filters = [
    { key: 'ALL', label: 'Alle' },
    { key: 'ACTIVE', label: 'Aktiv' },
    { key: 'RESERVED', label: 'Reserviert' },
    { key: 'SOLD', label: 'Verkauft' },
    { key: 'DEACTIVATED', label: 'Inaktiv' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <ArrowLeft size={22} color={colors.neutral[900]} />
        </Pressable>
        <Text style={styles.headerTitle}>Meine Inserate</Text>
        <Pressable
          onPress={() => router.push('/(tabs)/create')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.6 }]}
        >
          <Plus size={22} color={colors.primary[500]} />
        </Pressable>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setActiveFilter(f.key)}
            style={[
              styles.filterChip,
              activeFilter === f.key && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === f.key && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <LoadingState message="Lade Inserate..." />
      ) : filteredListings.length === 0 ? (
        <EmptyState
          icon={<Package size={48} color={colors.neutral[300]} strokeWidth={1.5} />}
          title="Keine Inserate"
          description={
            activeFilter === 'ALL'
              ? 'Du hast noch keine Inserate erstellt.'
              : 'Keine Inserate mit diesem Status.'
          }
          actionLabel={activeFilter === 'ALL' ? 'Inserat erstellen' : undefined}
          onAction={activeFilter === 'ALL' ? () => router.push('/(tabs)/create') : undefined}
        />
      ) : (
        <FlatList
          data={filteredListings}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary[500]}
            />
          }
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.listingRow}>
              <View style={styles.listingMain}>
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() => router.push(`/listing/${item.id}`)}
                >
                  <ListingCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} />
                </Pressable>
              </View>
              <View style={styles.listingMeta}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: (STATUS_LABELS[item.status]?.color ?? colors.neutral[400]) + '20' },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: STATUS_LABELS[item.status]?.color ?? colors.neutral[400] },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: STATUS_LABELS[item.status]?.color ?? colors.neutral[400] },
                    ]}
                  >
                    {STATUS_LABELS[item.status]?.label ?? item.status}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Eye size={14} color={colors.neutral[400]} />
                  <Text style={styles.metaText}>{item.viewCount} Aufrufe</Text>
                </View>
                <Pressable
                  onPress={() => handleOptions(item)}
                  style={({ pressed }) => [styles.optionsBtn, pressed && { opacity: 0.6 }]}
                >
                  <MoreVertical size={18} color={colors.neutral[500]} />
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', height: 52,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[200],
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1, fontSize: 17, fontWeight: '600',
    color: colors.neutral[900], textAlign: 'center',
  },
  addBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: spacing.md,
    paddingVertical: 10, gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 14, backgroundColor: colors.neutral[100],
  },
  filterChipActive: { backgroundColor: colors.primary[500] },
  filterChipText: { fontSize: 13, fontWeight: '500', color: colors.neutral[600] },
  filterChipTextActive: { color: colors.white },
  list: { paddingHorizontal: spacing.md, paddingBottom: 24 },
  listingRow: { marginBottom: 12 },
  listingMain: { flexDirection: 'row' },
  listingMeta: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4, paddingTop: 6, gap: 10,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  metaText: { fontSize: 12, color: colors.neutral[400] },
  optionsBtn: {
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
  },
});
