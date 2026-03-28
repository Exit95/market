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
import {
  ArrowLeft,
  Flag,
  Check,
  X,
  Eye,
  ChevronRight,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import Avatar from '@/components/ui/Avatar';
import { LoadingState, EmptyState } from '@/components/layout';
import { colors, spacing } from '@/theme';
import { formatRelativeDate } from '@/utils/format';
import { REPORT_REASONS } from '@/utils/constants';

interface AdminReport {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  description: string | null;
  status: string;
  createdAt: string;
  reporter?: { displayName: string; avatarUrl: string | null };
}

export default function AdminReportsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: reports,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<AdminReport[]>({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const { data } = await api.get('/admin/reports');
      return data;
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => {
      await api.put(`/admin/reports/${id}`, { status, resolutionNote: note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const handleResolve = useCallback(
    (report: AdminReport) => {
      Alert.alert('Meldung bearbeiten', `${getReasonLabel(report.reason)}`, [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Abweisen',
          onPress: () =>
            resolveMutation.mutate({ id: report.id, status: 'DISMISSED', note: 'Kein Verstoss' }),
        },
        {
          text: 'Bestaetigen & loesen',
          style: 'destructive',
          onPress: () =>
            resolveMutation.mutate({ id: report.id, status: 'RESOLVED', note: 'Verstoss bestaetigt' }),
        },
      ]);
    },
    [resolveMutation]
  );

  function getReasonLabel(reason: string): string {
    return REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason;
  }

  const renderReport = useCallback(
    ({ item }: { item: AdminReport }) => (
      <Pressable
        onPress={() => handleResolve(item)}
        style={({ pressed }) => [
          styles.reportCard,
          pressed && { backgroundColor: colors.neutral[50] },
        ]}
      >
        <View style={styles.reportTop}>
          <Avatar
            uri={item.reporter?.avatarUrl}
            name={item.reporter?.displayName ?? '?'}
            size="sm"
          />
          <View style={styles.reportInfo}>
            <Text style={styles.reportReason}>{getReasonLabel(item.reason)}</Text>
            <Text style={styles.reportMeta}>
              {item.targetType} | {item.reporter?.displayName ?? 'Anonym'} |{' '}
              {formatRelativeDate(item.createdAt)}
            </Text>
          </View>
          <View style={[styles.statusBadge, {
            backgroundColor: item.status === 'PENDING' ? colors.warning[50] :
              item.status === 'RESOLVED' ? colors.success[50] : colors.neutral[100],
          }]}>
            <Text style={[styles.statusText, {
              color: item.status === 'PENDING' ? colors.warning[600] :
                item.status === 'RESOLVED' ? colors.success[600] : colors.neutral[500],
            }]}>
              {item.status === 'PENDING' ? 'Offen' :
               item.status === 'RESOLVED' ? 'Geloest' :
               item.status === 'REVIEWING' ? 'In Pruefung' : 'Abgewiesen'}
            </Text>
          </View>
        </View>
        {item.description && (
          <Text style={styles.reportDesc} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </Pressable>
    ),
    [handleResolve]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <ArrowLeft size={22} color={colors.neutral[900]} />
        </Pressable>
        <Text style={styles.headerTitle}>Meldungen</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <LoadingState message="Lade Meldungen..." />
      ) : !reports || reports.length === 0 ? (
        <EmptyState
          icon={<Flag size={48} color={colors.neutral[300]} strokeWidth={1.5} />}
          title="Keine offenen Meldungen"
          description="Alle Meldungen wurden bearbeitet."
        />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderReport}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[500]} />
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
  list: { paddingBottom: 24 },
  reportCard: {
    paddingVertical: 14, paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[100],
  },
  reportTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reportInfo: { flex: 1 },
  reportReason: { fontSize: 15, fontWeight: '600', color: colors.neutral[900] },
  reportMeta: { fontSize: 12, color: colors.neutral[400], marginTop: 2 },
  reportDesc: {
    fontSize: 13, color: colors.neutral[600], lineHeight: 18,
    marginTop: 8, paddingLeft: 42,
  },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
});
