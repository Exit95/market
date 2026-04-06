import React from 'react';
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
import { ArrowLeft, Bot, AlertTriangle, Check } from 'lucide-react-native';
import { api } from '@/lib/api';
import { LoadingState, EmptyState } from '@/components/layout';
import { colors, spacing } from '@/theme';
import { formatRelativeDate } from '@/utils/format';

interface AiCheckEntry {
  id: string;
  checkType: string;
  targetType: string;
  targetId: string;
  score: number | null;
  flagged: boolean;
  reviewed: boolean;
  createdAt: string;
}

const CHECK_TYPE_LABELS: Record<string, string> = {
  listing_suggestion: 'Inserat-Vorschlag',
  listing_quality: 'Qualitaetspruefung',
  scam_detection: 'Scam-Erkennung',
};

export default function AdminAiChecksScreen() {
  const router = useRouter();

  const {
    data: checks,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<AiCheckEntry[]>({
    queryKey: ['admin-ai-checks'],
    queryFn: async () => {
      const { data } = await api.get('/admin/ai-checks');
      return data;
    },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <ArrowLeft size={22} color={colors.neutral[900]} />
        </Pressable>
        <Text style={styles.headerTitle}>KI-Pruefungen</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <LoadingState message="Lade KI-Pruefungen..." />
      ) : !checks || checks.length === 0 ? (
        <EmptyState
          icon={<Bot size={48} color={colors.neutral[300]} strokeWidth={1.5} />}
          title="Keine KI-Pruefungen"
          description="Es wurden noch keine KI-Pruefungen durchgefuehrt."
        />
      ) : (
        <FlatList
          data={checks}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[500]} />
          }
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.checkRow}>
              <View style={styles.checkIcon}>
                {item.flagged ? (
                  <AlertTriangle size={18} color={colors.error[500]} />
                ) : (
                  <Check size={18} color={colors.success[500]} />
                )}
              </View>
              <View style={styles.checkInfo}>
                <Text style={styles.checkType}>
                  {CHECK_TYPE_LABELS[item.checkType] ?? item.checkType}
                </Text>
                <Text style={styles.checkMeta}>
                  {item.targetType} | Score: {item.score != null ? (item.score * 100).toFixed(0) + '%' : '-'} |{' '}
                  {formatRelativeDate(item.createdAt)}
                </Text>
              </View>
              {item.flagged && !item.reviewed && (
                <View style={styles.unreviewedBadge}>
                  <Text style={styles.unreviewedText}>Offen</Text>
                </View>
              )}
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
  list: { paddingBottom: 24 },
  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[100],
  },
  checkIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.neutral[100],
    alignItems: 'center', justifyContent: 'center',
  },
  checkInfo: { flex: 1 },
  checkType: { fontSize: 14, fontWeight: '600', color: colors.neutral[900] },
  checkMeta: { fontSize: 12, color: colors.neutral[400], marginTop: 2 },
  unreviewedBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: colors.warning[50],
  },
  unreviewedText: { fontSize: 11, fontWeight: '600', color: colors.warning[600] },
});
