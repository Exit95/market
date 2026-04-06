import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Flag,
  Shield,
  AlertTriangle,
  Users,
  BarChart3,
  Bot,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { LoadingState } from '@/components/layout';
import { colors, spacing } from '@/theme';

interface AdminStats {
  pendingReports: number;
  flaggedListings: number;
  totalUsers: number;
  totalListings: number;
  totalDeals: number;
  aiChecksToday: number;
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data } = await api.get('/admin/stats');
      return data;
    },
  });

  // Nur fuer Moderatoren/Admins
  if (user?.role === 'USER') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.noAccess}>
          <Shield size={48} color={colors.neutral[300]} />
          <Text style={styles.noAccessText}>Kein Zugriff</Text>
        </View>
      </SafeAreaView>
    );
  }

  const cards = [
    {
      icon: <Flag size={24} color={colors.error[500]} />,
      label: 'Offene Meldungen',
      value: stats?.pendingReports ?? 0,
      bg: colors.error[50],
      onPress: () => router.push('/admin/reports'),
    },
    {
      icon: <AlertTriangle size={24} color={colors.warning[500]} />,
      label: 'KI-markierte Inserate',
      value: stats?.flaggedListings ?? 0,
      bg: colors.warning[50],
      onPress: () => router.push('/admin/flagged'),
    },
    {
      icon: <Users size={24} color={colors.primary[500]} />,
      label: 'Nutzer gesamt',
      value: stats?.totalUsers ?? 0,
      bg: colors.primary[50],
      onPress: () => {},
    },
    {
      icon: <BarChart3 size={24} color={colors.success[500]} />,
      label: 'Deals gesamt',
      value: stats?.totalDeals ?? 0,
      bg: colors.success[50],
      onPress: () => {},
    },
    {
      icon: <Bot size={24} color={colors.primary[600]} />,
      label: 'KI-Pruefungen heute',
      value: stats?.aiChecksToday ?? 0,
      bg: colors.primary[50],
      onPress: () => router.push('/admin/ai-checks'),
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <ArrowLeft size={22} color={colors.neutral[900]} />
        </Pressable>
        <Text style={styles.headerTitle}>Admin-Dashboard</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <LoadingState message="Lade Statistiken..." />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {cards.map((card, i) => (
              <Pressable
                key={i}
                onPress={card.onPress}
                style={({ pressed }) => [
                  styles.statCard,
                  { backgroundColor: card.bg },
                  pressed && { opacity: 0.8 },
                ]}
              >
                {card.icon}
                <Text style={styles.statValue}>{card.value}</Text>
                <Text style={styles.statLabel}>{card.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Schnellaktionen</Text>
          <View style={styles.actionList}>
            <Pressable
              onPress={() => router.push('/admin/reports')}
              style={({ pressed }) => [styles.actionRow, pressed && { backgroundColor: colors.neutral[50] }]}
            >
              <Flag size={20} color={colors.error[500]} />
              <Text style={styles.actionLabel}>Meldungen bearbeiten</Text>
              {(stats?.pendingReports ?? 0) > 0 && (
                <View style={styles.actionBadge}>
                  <Text style={styles.actionBadgeText}>{stats?.pendingReports}</Text>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={() => router.push('/admin/flagged')}
              style={({ pressed }) => [styles.actionRow, pressed && { backgroundColor: colors.neutral[50] }]}
            >
              <AlertTriangle size={20} color={colors.warning[500]} />
              <Text style={styles.actionLabel}>KI-Flags pruefen</Text>
              {(stats?.flaggedListings ?? 0) > 0 && (
                <View style={styles.actionBadge}>
                  <Text style={styles.actionBadgeText}>{stats?.flaggedListings}</Text>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={() => router.push('/admin/ai-checks')}
              style={({ pressed }) => [styles.actionRow, pressed && { backgroundColor: colors.neutral[50] }]}
            >
              <Bot size={20} color={colors.primary[500]} />
              <Text style={styles.actionLabel}>KI-Pruefungen einsehen</Text>
            </Pressable>
          </View>
        </ScrollView>
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
  scroll: { padding: spacing.md, paddingBottom: 40 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24,
  },
  statCard: {
    width: '47%', borderRadius: 12, padding: 16,
    alignItems: 'flex-start', gap: 8,
  },
  statValue: { fontSize: 28, fontWeight: '700', color: colors.neutral[900] },
  statLabel: { fontSize: 13, color: colors.neutral[600], fontWeight: '500' },
  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: colors.neutral[900],
    marginBottom: 10,
  },
  actionList: {
    backgroundColor: colors.surface, borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.black, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[100],
  },
  actionLabel: { flex: 1, fontSize: 15, color: colors.neutral[900] },
  actionBadge: {
    minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.error[500],
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  actionBadgeText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  noAccess: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  noAccessText: { fontSize: 16, color: colors.neutral[400] },
});
