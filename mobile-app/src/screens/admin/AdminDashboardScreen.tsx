import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';
import { statusColors } from '../../theme';
import { get } from '../../api/client';
import type { DealStatus } from '../../types';

type Props = NativeStackScreenProps<any, 'AdminDashboard'>;

interface AdminStats {
    totalUsers: number;
    totalListings: number;
    totalDeals: number;
    revenue: number;
    activeListings: number;
    pendingReviews: number;
    openDisputes: number;
    newUsersToday: number;
}

interface RecentActivity {
    id: string;
    type: 'deal' | 'listing' | 'user' | 'dispute';
    description: string;
    timestamp: string;
    status?: DealStatus;
}

const DEFAULT_STATS: AdminStats = {
    totalUsers: 0,
    totalListings: 0,
    totalDeals: 0,
    revenue: 0,
    activeListings: 0,
    pendingReviews: 0,
    openDisputes: 0,
    newUsersToday: 0,
};

export default function AdminDashboardScreen({ navigation }: Props) {
    const [stats, setStats] = useState<AdminStats>(DEFAULT_STATS);
    const [activities, setActivities] = useState<RecentActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [statsRes, activityRes] = await Promise.all([
                get<{ stats: AdminStats }>('/api/admin/stats'),
                get<{ activities: RecentActivity[] }>('/api/admin/activity?limit=20'),
            ]);
            if (statsRes.ok) setStats(statsRes.data.stats);
            if (activityRes.ok && activityRes.data.activities) setActivities(activityRes.data.activities);
        } catch {
            // silently handle
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, [fetchData]);

    const formatCurrency = (cents: number) =>
        new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);

    const formatTime = (iso: string) => {
        const date = new Date(iso);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'Gerade eben';
        if (diffMin < 60) return `vor ${diffMin} Min.`;
        const diffHours = Math.floor(diffMin / 60);
        if (diffHours < 24) return `vor ${diffHours} Std.`;
        return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    };

    const getActivityIcon = (type: string): keyof typeof Ionicons.glyphMap => {
        switch (type) {
            case 'deal': return 'cart-outline';
            case 'listing': return 'pricetag-outline';
            case 'user': return 'person-outline';
            case 'dispute': return 'warning-outline';
            default: return 'ellipse-outline';
        }
    };

    const getActivityColor = (type: string): string => {
        switch (type) {
            case 'deal': return colors.primary;
            case 'listing': return colors.success;
            case 'user': return colors.primary;
            case 'dispute': return colors.danger;
            default: return colors.textMuted;
        }
    };

    const renderStatCard = (
        label: string,
        value: string | number,
        icon: keyof typeof Ionicons.glyphMap,
        color: string,
        onPress?: () => void,
    ) => (
        <TouchableOpacity
            style={styles.statCard}
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
            disabled={!onPress}
        >
            <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Admin-Dashboard</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    {renderStatCard('Nutzer', stats.totalUsers, 'people-outline', colors.primary)}
                    {renderStatCard('Inserate', stats.totalListings, 'pricetags-outline', colors.success)}
                    {renderStatCard('Deals', stats.totalDeals, 'cart-outline', colors.primary)}
                    {renderStatCard('Umsatz', formatCurrency(stats.revenue), 'cash-outline', colors.success)}
                </View>

                {/* Key Metrics */}
                <View style={styles.metricsRow}>
                    <View style={styles.metricCard}>
                        <View style={styles.metricHeader}>
                            <Ionicons name="trending-up-outline" size={18} color={colors.success} />
                            <Text style={styles.metricLabel}>Neue Nutzer heute</Text>
                        </View>
                        <Text style={styles.metricValue}>{stats.newUsersToday}</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <View style={styles.metricHeader}>
                            <Ionicons name="list-outline" size={18} color={colors.primary} />
                            <Text style={styles.metricLabel}>Aktive Inserate</Text>
                        </View>
                        <Text style={styles.metricValue}>{stats.activeListings}</Text>
                    </View>
                </View>

                {/* Alerts */}
                {(stats.pendingReviews > 0 || stats.openDisputes > 0) && (
                    <View style={styles.alertsSection}>
                        {stats.pendingReviews > 0 && (
                            <View style={styles.alertCard}>
                                <Ionicons name="eye-outline" size={20} color={colors.accent} />
                                <View style={styles.alertInfo}>
                                    <Text style={styles.alertTitle}>{stats.pendingReviews} ausstehende Prüfungen</Text>
                                    <Text style={styles.alertDesc}>Inserate warten auf Freigabe</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                            </View>
                        )}
                        {stats.openDisputes > 0 && (
                            <View style={[styles.alertCard, styles.alertCardDanger]}>
                                <Ionicons name="warning-outline" size={20} color={colors.danger} />
                                <View style={styles.alertInfo}>
                                    <Text style={[styles.alertTitle, { color: colors.danger }]}>
                                        {stats.openDisputes} offene Streitfälle
                                    </Text>
                                    <Text style={styles.alertDesc}>Sofortige Aufmerksamkeit erforderlich</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                            </View>
                        )}
                    </View>
                )}

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Schnellaktionen</Text>
                    <View style={styles.actionsGrid}>
                        {[
                            { label: 'Prüfwarteschlange', icon: 'eye-outline' as const, color: colors.accent },
                            { label: 'Nutzerverwaltung', icon: 'people-outline' as const, color: colors.primary },
                            { label: 'Streitfälle', icon: 'warning-outline' as const, color: colors.danger },
                            { label: 'Statistiken', icon: 'bar-chart-outline' as const, color: colors.success },
                        ].map((action) => (
                            <TouchableOpacity key={action.label} style={styles.actionCard} activeOpacity={0.7}>
                                <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
                                    <Ionicons name={action.icon} size={24} color={action.color} />
                                </View>
                                <Text style={styles.actionLabel}>{action.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Recent Activity */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Letzte Aktivitäten</Text>
                    {activities.length > 0 ? (
                        activities.map((activity) => {
                            const iconName = getActivityIcon(activity.type);
                            const iconColor = getActivityColor(activity.type);
                            return (
                                <View key={activity.id} style={styles.activityItem}>
                                    <View style={[styles.activityIcon, { backgroundColor: iconColor + '15' }]}>
                                        <Ionicons name={iconName} size={18} color={iconColor} />
                                    </View>
                                    <View style={styles.activityContent}>
                                        <Text style={styles.activityDesc}>{activity.description}</Text>
                                        <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
                                    </View>
                                    {activity.status && (
                                        <View style={[styles.activityStatus, { backgroundColor: (statusColors[activity.status] ?? colors.textMuted) + '15' }]}>
                                            <Text style={[styles.activityStatusText, { color: statusColors[activity.status] ?? colors.textMuted }]}>
                                                {activity.status}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })
                    ) : (
                        <View style={styles.emptyActivity}>
                            <Ionicons name="pulse-outline" size={32} color={colors.textMuted} />
                            <Text style={styles.emptyActivityText}>Keine aktuellen Aktivitäten</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.navy,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    headerBtn: { padding: spacing.xs },
    headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.white },
    scrollContent: { paddingBottom: spacing.xxl },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: spacing.md,
        gap: spacing.sm,
    },
    statCard: {
        width: '48%',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.xs,
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
    },
    statValue: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.navy },
    statLabel: { fontSize: fontSize.sm, color: colors.textMuted },
    metricsRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
    },
    metricCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.sm,
    },
    metricHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    metricLabel: { fontSize: fontSize.sm, color: colors.textMuted },
    metricValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.navy },
    alertsSection: {
        padding: spacing.md,
        gap: spacing.sm,
    },
    alertCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.accentLight,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        gap: spacing.md,
    },
    alertCardDanger: { backgroundColor: colors.dangerLight },
    alertInfo: { flex: 1 },
    alertTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.accent },
    alertDesc: { fontSize: fontSize.sm, color: colors.textMuted },
    section: {
        backgroundColor: colors.surface,
        marginTop: spacing.md,
        padding: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sectionTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.semibold,
        color: colors.navy,
        marginBottom: spacing.md,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    actionCard: {
        width: '48%',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        gap: spacing.sm,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text, textAlign: 'center' },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        gap: spacing.sm,
    },
    activityIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityContent: { flex: 1 },
    activityDesc: { fontSize: fontSize.sm, color: colors.text },
    activityTime: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
    activityStatus: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    activityStatusText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    emptyActivity: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        gap: spacing.sm,
    },
    emptyActivityText: { fontSize: fontSize.base, color: colors.textMuted },
});
