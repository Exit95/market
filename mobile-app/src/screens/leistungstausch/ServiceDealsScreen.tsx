import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    FlatList,
    RefreshControl,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../../theme';
import { spacing, borderRadius, fontSize, fontWeight } from '../../theme/spacing';

const API_BASE = 'https://ehren-deal.de';

type Props = NativeStackScreenProps<any, 'ServiceDeals'>;

type TabKey = 'ALL' | 'ACTIVE' | 'COMPLETED';

const STATUS_LABELS: Record<string, string> = {
    ACTIVE: 'Aktiv',
    COMPLETED: 'Abgeschlossen',
    CANCELLED: 'Storniert',
    PENDING: 'Ausstehend',
};

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: colors.teal,
    COMPLETED: colors.success,
    CANCELLED: colors.textMuted,
    PENDING: colors.accent,
};

export default function ServiceDealsScreen({ navigation }: Props) {
    const [activeTab, setActiveTab] = useState<TabKey>('ALL');
    const [deals, setDeals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchDeals = useCallback(async () => {
        try {
            const cookie = await AsyncStorage.getItem('session_cookie');
            const res = await fetch(`${API_BASE}/api/leistungstausch/deals`, {
                headers: cookie ? { Cookie: cookie } : {},
            });
            if (res.ok) {
                const data = await res.json();
                setDeals(data.deals ?? []);
            }
        } catch {
            // silently handle
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchDeals();
    }, [fetchDeals]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', fetchDeals);
        return unsubscribe;
    }, [navigation, fetchDeals]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchDeals();
    }, [fetchDeals]);

    const handleComplete = async (dealId: string) => {
        Alert.alert(
            'Als abgeschlossen markieren?',
            'Damit bestätigst du, dass du deinen Teil der Leistung erbracht hast.',
            [
                { text: 'Abbrechen', style: 'cancel' },
                {
                    text: 'Bestätigen',
                    onPress: async () => {
                        try {
                            const cookie = await AsyncStorage.getItem('session_cookie');
                            const res = await fetch(`${API_BASE}/api/leistungstausch/deals/${dealId}/complete`, {
                                method: 'POST',
                                headers: cookie ? { Cookie: cookie } : {},
                            });
                            if (res.ok) {
                                fetchDeals();
                            } else {
                                Alert.alert('Fehler', 'Aktion konnte nicht ausgeführt werden.');
                            }
                        } catch {
                            Alert.alert('Fehler', 'Verbindungsfehler.');
                        }
                    },
                },
            ],
        );
    };

    const filteredDeals = deals.filter((d) => {
        if (activeTab === 'ALL') return true;
        if (activeTab === 'ACTIVE') return d.status === 'ACTIVE';
        if (activeTab === 'COMPLETED') return d.status === 'COMPLETED';
        return true;
    });

    const renderDealCard = ({ item }: { item: any }) => {
        const otherParty = item.otherParty ?? item.partner ?? {};
        const statusColor = STATUS_COLORS[item.status] ?? colors.textMuted;
        const statusLabel = STATUS_LABELS[item.status] ?? item.status;
        const myCompleted = item.myCompletion ?? item.myCompleted ?? false;
        const otherCompleted = item.otherCompletion ?? item.otherCompleted ?? false;

        return (
            <TouchableOpacity
                style={s.dealCard}
                onPress={() => navigation.navigate('DealDetail', { id: item.id })}
                activeOpacity={0.7}
            >
                {/* Avatar */}
                <View style={s.dealAvatar}>
                    <Text style={s.dealAvatarText}>
                        {(otherParty.firstName?.[0] ?? '?').toUpperCase()}
                    </Text>
                </View>

                {/* Info */}
                <View style={s.dealInfo}>
                    <Text style={s.dealOtherName}>
                        {otherParty.firstName ?? 'Unbekannt'} {otherParty.lastName?.[0] ? `${otherParty.lastName[0]}.` : ''}
                    </Text>
                    <Text style={s.dealTitle} numberOfLines={1}>
                        {item.listing?.title ?? item.title ?? 'Leistungstausch'}
                    </Text>

                    <View style={s.dealFooter}>
                        {/* Status badge */}
                        <View style={[s.statusBadge, { backgroundColor: statusColor + '15' }]}>
                            <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
                        </View>

                        {/* Completion dots */}
                        <View style={s.completionRow}>
                            <View style={[s.completionDot, myCompleted && s.completionDotDone]}>
                                <Ionicons
                                    name={myCompleted ? 'checkmark' : 'person'}
                                    size={10}
                                    color={myCompleted ? colors.white : colors.textMuted}
                                />
                            </View>
                            <View style={[s.completionDot, otherCompleted && s.completionDotDone]}>
                                <Ionicons
                                    name={otherCompleted ? 'checkmark' : 'person'}
                                    size={10}
                                    color={otherCompleted ? colors.white : colors.textMuted}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Complete action */}
                    {item.status === 'ACTIVE' && !myCompleted && (
                        <TouchableOpacity
                            style={s.completeBtn}
                            onPress={() => handleComplete(item.id)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="checkmark-circle-outline" size={16} color={colors.teal} />
                            <Text style={s.completeBtnText}>Als abgeschlossen markieren</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.header}>
                    <Text style={s.headerTitle}>Mein Leistungstausch</Text>
                </View>
                <View style={s.center}>
                    <ActivityIndicator size="large" color={colors.teal} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.header}>
                <Text style={s.headerTitle}>Mein Leistungstausch</Text>
            </View>

            {/* Filter Tabs */}
            <View style={s.tabs}>
                {([
                    { key: 'ALL' as TabKey, label: 'Alle' },
                    { key: 'ACTIVE' as TabKey, label: 'Aktiv' },
                    { key: 'COMPLETED' as TabKey, label: 'Abgeschlossen' },
                ]).map(({ key, label }) => (
                    <TouchableOpacity
                        key={key}
                        style={[s.tab, activeTab === key && s.tabActive]}
                        onPress={() => setActiveTab(key)}
                    >
                        <Text style={[s.tabText, activeTab === key && s.tabTextActive]}>{label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={filteredDeals}
                keyExtractor={(item) => item.id}
                renderItem={renderDealCard}
                contentContainerStyle={s.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />
                }
                ListEmptyComponent={
                    <View style={s.emptyState}>
                        <Ionicons name="swap-vertical" size={56} color={colors.tealLight} />
                        <Text style={s.emptyTitle}>Noch keine Leistungstausch-Deals</Text>
                        <Text style={s.emptySubtitle}>
                            Sende einen Vorschlag oder erstelle ein eigenes Angebot um loszulegen.
                        </Text>
                        <TouchableOpacity
                            style={s.emptyButton}
                            onPress={() => navigation.navigate('ServiceExplore')}
                        >
                            <Text style={s.emptyButtonText}>Angebote entdecken</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
        backgroundColor: colors.tealDark,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    headerTitle: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: colors.white,
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tabs: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: colors.teal,
    },
    tabText: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.medium,
        color: colors.textMuted,
    },
    tabTextActive: {
        color: colors.teal,
        fontWeight: fontWeight.semibold,
    },
    listContent: { paddingBottom: spacing.xxl },
    dealCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: spacing.md,
    },
    dealAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.tealLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dealAvatarText: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.teal },
    dealInfo: { flex: 1, gap: 3 },
    dealOtherName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
    dealTitle: { fontSize: fontSize.sm, color: colors.textSecondary },
    dealFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.xs,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: borderRadius.full,
    },
    statusText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    completionRow: { flexDirection: 'row', gap: spacing.xs },
    completionDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.borderLight,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    completionDotDone: {
        backgroundColor: colors.success,
        borderColor: colors.success,
    },
    completeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.sm,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        backgroundColor: colors.teal50,
        borderRadius: borderRadius.sm,
        alignSelf: 'flex-start',
    },
    completeBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.teal },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl * 2,
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
    },
    emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text },
    emptySubtitle: { fontSize: fontSize.base, color: colors.textMuted, textAlign: 'center' },
    emptyButton: {
        marginTop: spacing.md,
        backgroundColor: colors.teal,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    emptyButtonText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.white },
});
