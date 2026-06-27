import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    FlatList,
    Image,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';
import { statusColors } from '../../theme';
import { get } from '../../api/client';
import type { Deal, DealStatus } from '../../types';

type Props = NativeStackScreenProps<any, 'Deals'>;

const STATUS_LABELS: Record<DealStatus, string> = {
    PENDING: 'Ausstehend',
    PAYMENT_PENDING: 'Zahlung ausstehend',
    PAID: 'Bezahlt',
    SHIPPED: 'Versendet',
    DELIVERED: 'Geliefert',
    COMPLETED: 'Abgeschlossen',
    CANCELLED: 'Storniert',
    REFUNDED: 'Erstattet',
    DISPUTED: 'Streitfall',
};

const STATUS_ICONS: Record<DealStatus, keyof typeof Ionicons.glyphMap> = {
    PENDING: 'time-outline',
    PAYMENT_PENDING: 'card-outline',
    PAID: 'checkmark-circle-outline',
    SHIPPED: 'airplane-outline',
    DELIVERED: 'cube-outline',
    COMPLETED: 'shield-checkmark-outline',
    CANCELLED: 'close-circle-outline',
    REFUNDED: 'arrow-undo-outline',
    DISPUTED: 'warning-outline',
};

type TabKey = 'purchases' | 'sales';

export default function DealsScreen({ navigation }: Props) {
    const [activeTab, setActiveTab] = useState<TabKey>('purchases');
    const [purchases, setPurchases] = useState<Deal[]>([]);
    const [sales, setSales] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchDeals = useCallback(async () => {
        try {
            const [buyRes, sellRes] = await Promise.all([
                get<{ deals: Deal[] }>('/api/deals?role=buyer'),
                get<{ deals: Deal[] }>('/api/deals?role=seller'),
            ]);
            if (buyRes.ok && buyRes.data.deals) setPurchases(buyRes.data.deals);
            if (sellRes.ok && sellRes.data.deals) setSales(sellRes.data.deals);
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

    const currentDeals = activeTab === 'purchases' ? purchases : sales;

    const formatPrice = (cents: number) =>
        new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });

    const renderDealCard = ({ item }: { item: Deal }) => {
        const statusColor = statusColors[item.status] ?? colors.textMuted;
        const statusIcon = STATUS_ICONS[item.status] ?? 'help-circle-outline';
        const otherParty = activeTab === 'purchases' ? item.seller : item.buyer;

        return (
            <TouchableOpacity
                style={styles.dealCard}
                onPress={() => navigation.navigate('DealDetail', { id: item.id })}
                activeOpacity={0.7}
            >
                {/* Listing Image */}
                <View style={styles.dealImageWrap}>
                    {item.listing.images?.[0] ? (
                        <Image source={{ uri: item.listing.images[0].url }} style={styles.dealImage} />
                    ) : (
                        <View style={styles.dealImagePlaceholder}>
                            <Ionicons name="image-outline" size={24} color={colors.textMuted} />
                        </View>
                    )}
                </View>

                {/* Deal Info */}
                <View style={styles.dealInfo}>
                    <Text style={styles.dealTitle} numberOfLines={1}>{item.listing.title}</Text>
                    <Text style={styles.dealPrice}>{formatPrice(item.totalAmount)}</Text>

                    <View style={styles.dealMetaRow}>
                        <Text style={styles.dealOtherParty}>
                            {activeTab === 'purchases' ? 'Verkäufer' : 'Käufer'}:{' '}
                            {otherParty.firstName} {otherParty.lastName?.[0]}.
                        </Text>
                    </View>

                    <View style={styles.dealFooter}>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                            <Ionicons name={statusIcon} size={14} color={statusColor} />
                            <Text style={[styles.statusText, { color: statusColor }]}>
                                {STATUS_LABELS[item.status]}
                            </Text>
                        </View>
                        <Text style={styles.dealDate}>{formatDate(item.createdAt)}</Text>
                    </View>
                </View>

                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Meine Deals</Text>
                </View>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Meine Deals</Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'purchases' && styles.tabActive]}
                    onPress={() => setActiveTab('purchases')}
                >
                    <Ionicons
                        name="cart-outline"
                        size={18}
                        color={activeTab === 'purchases' ? colors.primary : colors.textMuted}
                    />
                    <Text style={[styles.tabText, activeTab === 'purchases' && styles.tabTextActive]}>
                        Käufe ({purchases.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'sales' && styles.tabActive]}
                    onPress={() => setActiveTab('sales')}
                >
                    <Ionicons
                        name="pricetag-outline"
                        size={18}
                        color={activeTab === 'sales' ? colors.primary : colors.textMuted}
                    />
                    <Text style={[styles.tabText, activeTab === 'sales' && styles.tabTextActive]}>
                        Verkäufe ({sales.length})
                    </Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={currentDeals}
                keyExtractor={(item) => item.id}
                renderItem={renderDealCard}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons
                            name={activeTab === 'purchases' ? 'cart-outline' : 'pricetag-outline'}
                            size={56}
                            color={colors.textMuted}
                        />
                        <Text style={styles.emptyTitle}>
                            {activeTab === 'purchases' ? 'Noch keine Käufe' : 'Noch keine Verkäufe'}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {activeTab === 'purchases'
                                ? 'Finde tolle Angebote auf dem Marktplatz'
                                : 'Erstelle ein Inserat um loszulegen'
                            }
                        </Text>
                        <TouchableOpacity
                            style={styles.emptyButton}
                            onPress={() => navigation.navigate(activeTab === 'purchases' ? 'Home' : 'CreateListing')}
                        >
                            <Text style={styles.emptyButtonText}>
                                {activeTab === 'purchases' ? 'Marktplatz öffnen' : 'Inserat erstellen'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
        backgroundColor: colors.navy,
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        gap: spacing.xs,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: colors.primary,
    },
    tabText: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.medium,
        color: colors.textMuted,
    },
    tabTextActive: {
        color: colors.primary,
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
    dealImageWrap: {
        width: 72,
        height: 72,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        backgroundColor: colors.borderLight,
    },
    dealImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    dealImagePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
    dealInfo: { flex: 1, gap: 3 },
    dealTitle: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
    dealPrice: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.navy },
    dealMetaRow: { flexDirection: 'row', alignItems: 'center' },
    dealOtherParty: { fontSize: fontSize.xs, color: colors.textMuted },
    dealFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: borderRadius.full,
        gap: 4,
    },
    statusText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    dealDate: { fontSize: fontSize.xs, color: colors.textMuted },
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
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    emptyButtonText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.white },
});
