import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, AlertTriangle, Check, Eye } from 'lucide-react-native';
import { api } from '@/lib/api';
import { LoadingState, EmptyState } from '@/components/layout';
import { colors, spacing } from '@/theme';
import { formatRelativeDate, formatPrice } from '@/utils/format';

interface FlaggedListing {
  id: string;
  title: string;
  price: number;
  aiRiskScore: number;
  aiQualityScore: number;
  aiSuggestions: any;
  status: string;
  createdAt: string;
  seller: { displayName: string; trustLevel: string };
}

export default function AdminFlaggedScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: listings,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<FlaggedListing[]>({
    queryKey: ['admin-flagged'],
    queryFn: async () => {
      const { data } = await api.get('/admin/flagged-listings');
      return data;
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'deactivate' }) => {
      await api.put(`/admin/listings/${id}/review`, { action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-flagged'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const handleAction = useCallback(
    (listing: FlaggedListing) => {
      Alert.alert(
        listing.title,
        `Risk Score: ${(listing.aiRiskScore * 100).toFixed(0)}%\nQuality: ${(listing.aiQualityScore * 100).toFixed(0)}%`,
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Anzeigen',
            onPress: () => router.push(`/listing/${listing.id}`),
          },
          {
            text: 'Genehmigen',
            onPress: () => reviewMutation.mutate({ id: listing.id, action: 'approve' }),
          },
          {
            text: 'Deaktivieren',
            style: 'destructive',
            onPress: () => reviewMutation.mutate({ id: listing.id, action: 'deactivate' }),
          },
        ]
      );
    },
    [router, reviewMutation]
  );

  function getRiskColor(score: number): string {
    if (score >= 0.8) return colors.error[500];
    if (score >= 0.5) return colors.warning[500];
    return colors.success[500];
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <ArrowLeft size={22} color={colors.neutral[900]} />
        </Pressable>
        <Text style={styles.headerTitle}>KI-markierte Inserate</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <LoadingState message="Lade markierte Inserate..." />
      ) : !listings || listings.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle size={48} color={colors.neutral[300]} strokeWidth={1.5} />}
          title="Keine markierten Inserate"
          description="Die KI hat aktuell keine verdaechtigen Inserate gefunden."
        />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[500]} />
          }
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleAction(item)}
              style={({ pressed }) => [
                styles.card,
                pressed && { backgroundColor: colors.neutral[50] },
              ]}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.metaText}>
                  von {item.seller.displayName} | {formatRelativeDate(item.createdAt)}
                </Text>
              </View>
              <View style={styles.scoresRow}>
                <View style={styles.scoreChip}>
                  <View style={[styles.scoreDot, { backgroundColor: getRiskColor(item.aiRiskScore) }]} />
                  <Text style={styles.scoreLabel}>
                    Risiko: {(item.aiRiskScore * 100).toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.scoreChip}>
                  <Text style={styles.scoreLabel}>
                    Qualitaet: {(item.aiQualityScore * 100).toFixed(0)}%
                  </Text>
                </View>
              </View>
            </Pressable>
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
  list: { paddingBottom: 24 },
  card: {
    paddingVertical: 14, paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[100],
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.neutral[900] },
  cardPrice: { fontSize: 14, fontWeight: '700', color: colors.primary[600], marginLeft: 8 },
  cardMeta: { marginTop: 4 },
  metaText: { fontSize: 12, color: colors.neutral[400] },
  scoresRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  scoreChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: colors.neutral[100],
  },
  scoreDot: { width: 6, height: 6, borderRadius: 3 },
  scoreLabel: { fontSize: 12, fontWeight: '500', color: colors.neutral[600] },
});
