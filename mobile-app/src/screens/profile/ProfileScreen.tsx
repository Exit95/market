import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Image,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';
import { trustLevelColors } from '../../theme';
import { get } from '../../api/client';
import type { User, TrustLevel } from '../../types';

type Props = NativeStackScreenProps<any, 'Profile'>;

const TRUST_LABELS: Record<TrustLevel, string> = {
    NEW: 'Neu',
    BASIC: 'Basis',
    VERIFIED: 'Verifiziert',
    TRUSTED: 'Vertrauenswürdig',
    ELITE: 'Elite',
};

const TRUST_DESCRIPTIONS: Record<TrustLevel, string> = {
    NEW: 'Willkommen auf Ehren-Deal!',
    BASIC: 'E-Mail verifiziert',
    VERIFIED: 'Identität bestätigt',
    TRUSTED: 'Erfahrener und zuverlässiger Händler',
    ELITE: 'Top-Mitglied der Community',
};

interface ProfileStats {
    listingCount: number;
    dealCount: number;
    completedDeals: number;
}

export default function ProfileScreen({ navigation }: Props) {
    const [user, setUser] = useState<User | null>(null);
    const [stats, setStats] = useState<ProfileStats>({ listingCount: 0, dealCount: 0, completedDeals: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchProfile = useCallback(async () => {
        try {
            const [meRes, statsRes] = await Promise.all([
                get<{ user: User }>('/api/auth/me'),
                get<ProfileStats>('/api/profile/stats'),
            ]);
            if (meRes.ok) setUser(meRes.data.user);
            if (statsRes.ok) setStats(statsRes.data);
        } catch {
            // silently handle
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', fetchProfile);
        return unsubscribe;
    }, [navigation, fetchProfile]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchProfile();
    }, [fetchProfile]);

    if (loading) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!user) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.center}>
                    <Ionicons name="person-outline" size={56} color={colors.textMuted} />
                    <Text style={styles.loginPromptTitle}>Nicht angemeldet</Text>
                    <Text style={styles.loginPromptText}>Melde dich an um dein Profil zu sehen</Text>
                    <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.loginButtonText}>Anmelden</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const trustLevel = user.trustScore?.level ?? 'NEW';
    const trustScore = user.trustScore?.score ?? 0;
    const trustColor = trustLevelColors[trustLevel];

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Mein Profil</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.headerBtn}>
                    <Ionicons name="settings-outline" size={24} color={colors.white} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarSection}>
                        {user.avatarUrl ? (
                            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarFallback}>
                                <Text style={styles.avatarText}>
                                    {(user.firstName?.[0] ?? user.email[0]).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.editAvatarBtn}
                            onPress={() => navigation.navigate('Settings')}
                        >
                            <Ionicons name="camera-outline" size={14} color={colors.white} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.userName}>
                        {user.firstName} {user.lastName}
                    </Text>
                    {user.city && (
                        <View style={styles.locationRow}>
                            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                            <Text style={styles.locationText}>{user.city}</Text>
                        </View>
                    )}

                    {/* Trust Score */}
                    <View style={styles.trustSection}>
                        <View style={styles.trustScoreRow}>
                            <View style={[styles.trustBadge, { backgroundColor: trustColor + '15' }]}>
                                <Ionicons name="star" size={16} color={trustColor} />
                                <Text style={[styles.trustBadgeText, { color: trustColor }]}>
                                    {TRUST_LABELS[trustLevel]}
                                </Text>
                            </View>
                            <Text style={styles.trustScoreNum}>{trustScore} Punkte</Text>
                        </View>

                        {/* Trust Progress Bar */}
                        <View style={styles.trustBarBg}>
                            <View style={[styles.trustBarFill, { width: `${Math.min(trustScore, 100)}%`, backgroundColor: trustColor }]} />
                        </View>
                        <Text style={styles.trustDesc}>{TRUST_DESCRIPTIONS[trustLevel]}</Text>
                    </View>
                </View>

                {/* Verification Badges */}
                <View style={styles.verificationsCard}>
                    <Text style={styles.sectionTitle}>Verifizierungen</Text>
                    <View style={styles.verificationsList}>
                        <View style={styles.verificationItem}>
                            <Ionicons
                                name={user.emailVerified ? 'checkmark-circle' : 'close-circle-outline'}
                                size={22}
                                color={user.emailVerified ? colors.success : colors.textMuted}
                            />
                            <Text style={styles.verificationLabel}>E-Mail</Text>
                            <Text style={[styles.verificationStatus, user.emailVerified && styles.verificationDone]}>
                                {user.emailVerified ? 'Bestätigt' : 'Ausstehend'}
                            </Text>
                        </View>
                        <View style={styles.verificationItem}>
                            <Ionicons
                                name={user.phoneVerified ? 'checkmark-circle' : 'close-circle-outline'}
                                size={22}
                                color={user.phoneVerified ? colors.success : colors.textMuted}
                            />
                            <Text style={styles.verificationLabel}>Telefon</Text>
                            <Text style={[styles.verificationStatus, user.phoneVerified && styles.verificationDone]}>
                                {user.phoneVerified ? 'Bestätigt' : 'Ausstehend'}
                            </Text>
                        </View>
                        <View style={styles.verificationItem}>
                            <Ionicons
                                name={user.idVerified ? 'checkmark-circle' : 'close-circle-outline'}
                                size={22}
                                color={user.idVerified ? colors.success : colors.textMuted}
                            />
                            <Text style={styles.verificationLabel}>Identität (IDnow)</Text>
                            <Text style={[styles.verificationStatus, user.idVerified && styles.verificationDone]}>
                                {user.idVerified ? 'Bestätigt' : 'Ausstehend'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Stats */}
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNum}>{stats.listingCount}</Text>
                        <Text style={styles.statLabel}>Inserate</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNum}>{stats.dealCount}</Text>
                        <Text style={styles.statLabel}>Deals</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNum}>{stats.completedDeals}</Text>
                        <Text style={styles.statLabel}>Abgeschlossen</Text>
                    </View>
                </View>

                {/* Quick Links */}
                <View style={styles.menuCard}>
                    {[
                        { label: 'Meine Inserate', icon: 'pricetags-outline' as const, screen: 'MyListings' },
                        { label: 'Merkliste', icon: 'heart-outline' as const, screen: 'Merkliste' },
                        { label: 'Einstellungen', icon: 'settings-outline' as const, screen: 'Settings' },
                    ].map((item) => (
                        <TouchableOpacity
                            key={item.label}
                            style={styles.menuItem}
                            onPress={() => navigation.navigate(item.screen)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name={item.icon} size={22} color={colors.primary} />
                            <Text style={styles.menuLabel}>{item.label}</Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Admin Link */}
                {user.role === 'ADMIN' && (
                    <TouchableOpacity
                        style={styles.adminCard}
                        onPress={() => navigation.navigate('AdminDashboard')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="shield-outline" size={22} color={colors.accent} />
                        <Text style={styles.adminLabel}>Admin-Dashboard</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.accent} />
                    </TouchableOpacity>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
    loginPromptTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: colors.text },
    loginPromptText: { fontSize: fontSize.base, color: colors.textMuted, textAlign: 'center' },
    loginButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        marginTop: spacing.sm,
    },
    loginButtonText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.white },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.navy,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.white },
    headerBtn: { padding: spacing.xs },
    scrollContent: { paddingBottom: spacing.xxl },
    profileCard: {
        backgroundColor: colors.surface,
        padding: spacing.lg,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    avatarSection: { position: 'relative', marginBottom: spacing.md },
    avatar: { width: 88, height: 88, borderRadius: 44 },
    avatarFallback: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { fontSize: fontSize['3xl'], fontWeight: fontWeight.bold, color: colors.primary },
    editAvatarBtn: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.surface,
    },
    userName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.navy },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
    locationText: { fontSize: fontSize.sm, color: colors.textMuted },
    trustSection: { width: '100%', marginTop: spacing.lg, gap: spacing.sm },
    trustScoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    trustBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        gap: spacing.xs,
    },
    trustBadgeText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    trustScoreNum: { fontSize: fontSize.sm, color: colors.textMuted },
    trustBarBg: {
        height: 6,
        backgroundColor: colors.borderLight,
        borderRadius: 3,
        overflow: 'hidden',
    },
    trustBarFill: { height: 6, borderRadius: 3 },
    trustDesc: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center' },
    verificationsCard: {
        backgroundColor: colors.surface,
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.navy, marginBottom: spacing.md },
    verificationsList: { gap: spacing.md },
    verificationItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    verificationLabel: { flex: 1, fontSize: fontSize.base, color: colors.text },
    verificationStatus: { fontSize: fontSize.sm, color: colors.textMuted },
    verificationDone: { color: colors.success, fontWeight: fontWeight.medium },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statNum: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.navy },
    statLabel: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
    statDivider: { width: 1, backgroundColor: colors.border },
    menuCard: {
        backgroundColor: colors.surface,
        marginTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        gap: spacing.md,
    },
    menuLabel: { flex: 1, fontSize: fontSize.base, color: colors.text },
    adminCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.accentLight,
        marginHorizontal: spacing.lg,
        marginTop: spacing.lg,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        gap: spacing.md,
    },
    adminLabel: { flex: 1, fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.accent },
});
