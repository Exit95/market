import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Package,
  Handshake,
  Heart,
  Star,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronRight,
  Edit3,
  Bell,
  Shield,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useAuth } from '@/hooks/use-auth';
import { profileService } from '@/services';
import ProfileHeader from '@/components/profile/ProfileHeader';
import { LoadingState } from '@/components/layout';
import { colors, spacing } from '@/theme';

interface MyStats {
  activeListings: number;
  completedDeals: number;
  avgRating: number;
}

interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  badge?: number;
  destructive?: boolean;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const [loggingOut, setLoggingOut] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<MyStats>({
    queryKey: ['my-stats'],
    queryFn: profileService.getMyStats,
  });

  const handleLogout = useCallback(() => {
    Alert.alert('Abmelden', 'Moechtest du dich wirklich abmelden?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Abmelden',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await logout();
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  }, [logout]);

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Meine Aktivitaeten',
      items: [
        {
          key: 'listings',
          label: 'Meine Inserate',
          icon: <Package size={20} color={colors.neutral[600]} />,
          onPress: () => router.push('/my-listings'),
          badge: stats?.activeListings,
        },
        {
          key: 'deals',
          label: 'Meine Deals',
          icon: <Handshake size={20} color={colors.neutral[600]} />,
          onPress: () => router.push('/my-deals'),
          badge: stats?.completedDeals,
        },
        {
          key: 'favorites',
          label: 'Favoriten',
          icon: <Heart size={20} color={colors.neutral[600]} />,
          onPress: () => router.push('/favorites'),
        },
        {
          key: 'reviews',
          label: 'Bewertungen',
          icon: <Star size={20} color={colors.neutral[600]} />,
          onPress: () =>
            user ? router.push(`/user/${user.id}`) : undefined,
        },
      ],
    },
    {
      title: 'Konto',
      items: [
        {
          key: 'notifications',
          label: 'Benachrichtigungen',
          icon: <Bell size={20} color={colors.neutral[600]} />,
          onPress: () => router.push('/notifications'),
        },
        {
          key: 'verification',
          label: 'Verifizierung',
          icon: <ShieldCheck size={20} color={colors.neutral[600]} />,
          onPress: () => {
            Alert.alert(
              'Verifizierung',
              'Die Verifizierung ist derzeit noch nicht verfuegbar. Wir arbeiten daran!'
            );
          },
        },
        {
          key: 'settings',
          label: 'Einstellungen',
          icon: <Settings size={20} color={colors.neutral[600]} />,
          onPress: () => router.push('/settings'),
        },
        {
          key: 'logout',
          label: 'Abmelden',
          icon: <LogOut size={20} color={colors.error[500]} />,
          onPress: handleLogout,
          destructive: true,
        },
      ],
    },
  ];

  // Admin-Bereich fuer Moderatoren/Admins
  if (user?.role === 'MODERATOR' || user?.role === 'ADMIN') {
    menuSections.splice(1, 0, {
      title: 'Administration',
      items: [
        {
          key: 'admin',
          label: 'Admin-Dashboard',
          icon: <Shield size={20} color={colors.primary[600]} />,
          onPress: () => router.push('/admin'),
        },
      ],
    });
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LoadingState message="Profil wird geladen..." />
      </SafeAreaView>
    );
  }

  const completeness = getProfileCompleteness(profile);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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
            createdAt: user?.createdAt ?? new Date().toISOString(),
          }}
          isOwn
        />

        {/* Edit Profile Button */}
        <View style={styles.editRow}>
          <Pressable
            onPress={() => router.push('/edit-profile')}
            style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.7 }]}
          >
            <Edit3 size={16} color={colors.primary[500]} />
            <Text style={styles.editBtnText}>Profil bearbeiten</Text>
          </Pressable>
        </View>

        {/* Completeness Bar */}
        {!profile.onboardingCompleted && (
          <View style={styles.completenessCard}>
            <View style={styles.completenessHeader}>
              <Text style={styles.completenessTitle}>Profil vervollstaendigen</Text>
              <Text style={styles.completenessPercent}>{completeness}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${completeness}%` },
                ]}
              />
            </View>
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {statsLoading ? '-' : stats?.activeListings ?? 0}
            </Text>
            <Text style={styles.statLabel}>Aktive Inserate</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {statsLoading ? '-' : stats?.completedDeals ?? 0}
            </Text>
            <Text style={styles.statLabel}>Abgeschlossen</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {statsLoading ? '-' : (stats?.avgRating?.toFixed(1) ?? '-')}
            </Text>
            <Text style={styles.statLabel}>Bewertung</Text>
          </View>
        </View>

        {/* Menu Sections */}
        {menuSections.map((section) => (
          <View key={section.title} style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, idx) => (
                <Pressable
                  key={item.key}
                  onPress={item.onPress}
                  disabled={loggingOut && item.key === 'logout'}
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed && styles.menuItemPressed,
                    idx < section.items.length - 1 && styles.menuItemBorder,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                >
                  <View style={styles.menuItemLeft}>
                    {item.icon}
                    <Text
                      style={[
                        styles.menuItemLabel,
                        item.destructive && styles.menuItemDestructive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                  <View style={styles.menuItemRight}>
                    {item.badge != null && item.badge > 0 && (
                      <View style={styles.badgePill}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    )}
                    {!item.destructive && (
                      <ChevronRight
                        size={18}
                        color={colors.neutral[400]}
                      />
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getProfileCompleteness(profile: {
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  city: string;
}): number {
  let done = 0;
  const total = 4;
  if (profile.displayName) done++;
  if (profile.avatarUrl) done++;
  if (profile.bio) done++;
  if (profile.city) done++;
  return Math.round((done / total) * 100);
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingBottom: 24,
  },
  editRow: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.primary[500],
    borderRadius: 10,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[500],
  },
  completenessCard: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.primary[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: spacing.md,
  },
  completenessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  completenessTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[700],
  },
  completenessPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary[500],
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary[100],
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary[500],
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: 10,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  statLabel: {
    fontSize: 11,
    color: colors.neutral[500],
    marginTop: 4,
  },
  menuSection: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemPressed: {
    backgroundColor: colors.neutral[50],
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[200],
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 15,
    color: colors.neutral[900],
    fontWeight: '400',
  },
  menuItemDestructive: {
    color: colors.error[500],
    fontWeight: '500',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgePill: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
});
