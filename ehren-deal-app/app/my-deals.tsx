import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Handshake,
  ChevronRight,
  Package,
  User,
} from 'lucide-react-native';
import { dealService } from '@/services';
import { useAuthStore } from '@/store/auth-store';
import Avatar from '@/components/ui/Avatar';
import StatusIndicator from '@/components/ui/StatusIndicator';
import { LoadingState, EmptyState } from '@/components/layout';
import { colors, spacing } from '@/theme';
import { formatPrice, formatRelativeDate } from '@/utils/format';
import { DEAL_STATUS_LABELS } from '@/utils/constants';

const TAB_FILTERS = [
  { key: 'active', label: 'Aktiv' },
  { key: 'completed', label: 'Abgeschlossen' },
  { key: 'canceled', label: 'Storniert' },
];

const ACTIVE_STATUSES = ['INQUIRY', 'NEGOTIATING', 'RESERVED', 'AGREED', 'PAID', 'SHIPPED', 'HANDED_OVER'];

export default function MyDealsScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const [activeTab, setActiveTab] = useState('active');

  const {
    data: deals,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['my-deals'],
    queryFn: () => dealService.getDeals(),
    enabled: !!profile,
  });

  const allDeals = deals ?? [];

  const filteredDeals = allDeals.filter((deal: any) => {
    if (activeTab === 'active') return ACTIVE_STATUSES.includes(deal.status);
    if (activeTab === 'completed') return deal.status === 'COMPLETED';
    if (activeTab === 'canceled') return ['CANCELED', 'CONFLICT'].includes(deal.status);
    return true;
  });

  const renderDeal = useCallback(
    ({ item }: { item: any }) => {
      const isBuyer = item.buyerId === profile?.id;
      const otherParty = item.otherParty ?? (isBuyer ? item.seller : item.buyer);
      const listingTitle = item.listing?.title ?? 'Inserat';
      const listingImage = item.listing?.images?.[0]?.url;

      return (
        <Pressable
          onPress={() => router.push(`/deal/${item.id}`)}
          style={({ pressed }) => [
            styles.dealCard,
            pressed && { backgroundColor: colors.neutral[50] },
          ]}
        >
          <View style={styles.dealTop}>
            <Avatar
              uri={otherParty?.avatarUrl}
              name={otherParty?.displayName ?? '?'}
              size="sm"
            />
            <View style={styles.dealInfo}>
              <Text style={styles.dealTitle} numberOfLines={1}>
                {listingTitle}
              </Text>
              <Text style={styles.dealSubtitle}>
                {isBuyer ? 'Kauf von' : 'Verkauf an'}{' '}
                {otherParty?.displayName ?? 'Unbekannt'}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.neutral[300]} />
          </View>

          <View style={styles.dealBottom}>
            <StatusIndicator status={item.status} />
            <Text style={styles.dealPrice}>
              {item.agreedPrice
                ? formatPrice(item.agreedPrice)
                : item.listing?.price
                  ? formatPrice(item.listing.price)
                  : ''}
            </Text>
            <Text style={styles.dealDate}>
              {formatRelativeDate(item.updatedAt)}
            </Text>
          </View>
        </Pressable>
      );
    },
    [profile, router]
  );

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
        <Text style={styles.headerTitle}>Meine Deals</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TAB_FILTERS.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <LoadingState message="Lade Deals..." />
      ) : filteredDeals.length === 0 ? (
        <EmptyState
          icon={<Handshake size={48} color={colors.neutral[300]} strokeWidth={1.5} />}
          title="Keine Deals"
          description={
            activeTab === 'active'
              ? 'Du hast aktuell keine aktiven Deals.'
              : activeTab === 'completed'
                ? 'Du hast noch keine Deals abgeschlossen.'
                : 'Keine stornierten Deals.'
          }
        />
      ) : (
        <FlatList
          data={filteredDeals}
          keyExtractor={(item: any) => item.id}
          renderItem={renderDeal}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary[500]}
            />
          }
          contentContainerStyle={styles.list}
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
  tabRow: {
    flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[200],
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary[500] },
  tabText: { fontSize: 14, fontWeight: '500', color: colors.neutral[400] },
  tabTextActive: { color: colors.primary[500], fontWeight: '600' },
  list: { paddingVertical: 8 },
  dealCard: {
    paddingVertical: 14, paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[100],
  },
  dealTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dealInfo: { flex: 1 },
  dealTitle: { fontSize: 15, fontWeight: '600', color: colors.neutral[900] },
  dealSubtitle: { fontSize: 13, color: colors.neutral[500], marginTop: 2 },
  dealBottom: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 10, paddingLeft: 44,
  },
  dealPrice: { fontSize: 14, fontWeight: '700', color: colors.primary[600] },
  dealDate: { fontSize: 12, color: colors.neutral[400], marginLeft: 'auto' },
});
