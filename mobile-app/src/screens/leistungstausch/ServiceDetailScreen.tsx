import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../../theme';
import { spacing, borderRadius, fontSize, fontWeight } from '../../theme/spacing';

const API_BASE = 'https://ehren-deal.de';

type Props = NativeStackScreenProps<any, 'ServiceDetail'>;

const EFFORT_LABELS: Record<string, string> = {
    UNTER_1_STUNDE: '< 1 Stunde',
    EIN_BIS_DREI_STUNDEN: '1–3 Stunden',
    DREI_BIS_ACHT_STUNDEN: '3–8 Stunden',
    MEHRERE_TAGE: 'Mehrere Tage',
    FORTLAUFEND: 'Fortlaufend',
};

const EXPERIENCE_LABELS: Record<string, string> = {
    EINSTEIGER: 'Einsteiger',
    FORTGESCHRITTEN: 'Fortgeschritten',
    EXPERTE: 'Experte',
    PROFI: 'Profi',
};

export default function ServiceDetailScreen({ navigation, route }: Props) {
    const { id } = route.params as { id: string };
    const [listing, setListing] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const cookie = await AsyncStorage.getItem('session_cookie');
                const res = await fetch(`${API_BASE}/api/leistungstausch/listings/${id}`, {
                    headers: cookie ? { Cookie: cookie } : {},
                });
                if (res.ok) {
                    const data = await res.json();
                    setListing(data.listing ?? data);
                }
            } catch {
                Alert.alert('Fehler', 'Angebot konnte nicht geladen werden.');
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

    if (loading) {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.center}>
                    <ActivityIndicator size="large" color={colors.teal} />
                </View>
            </SafeAreaView>
        );
    }

    if (!listing) {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.center}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
                    <Text style={s.errorText}>Angebot nicht gefunden</Text>
                </View>
            </SafeAreaView>
        );
    }

    const user = listing.user ?? {};
    const isVerified = user.emailVerified || user.phoneVerified;
    const isIdVerified = user.idVerified;
    const memberSince = user.createdAt ? formatDate(user.createdAt) : '';
    const soughtCategories = listing.soughtCategories ?? [];

    return (
        <SafeAreaView style={s.safe}>
            {/* Top Bar */}
            <View style={s.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.topBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.white} />
                </TouchableOpacity>
                <Text style={s.topTitle}>Leistungstausch</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={s.scrollContent}>
                {/* Header Card */}
                <View style={s.headerCard}>
                    <View style={s.categoryBadge}>
                        <Text style={s.categoryBadgeText}>{listing.offeredCategory?.name ?? 'Kategorie'}</Text>
                    </View>
                    <Text style={s.title}>{listing.title}</Text>
                    <View style={s.metaRow}>
                        <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
                        <Text style={s.metaText}>{EFFORT_LABELS[listing.effort] ?? listing.effort}</Text>
                        <Ionicons name={listing.locationType === 'REMOTE' ? 'desktop-outline' : 'location-outline'} size={14} color="rgba(255,255,255,0.7)" style={{ marginLeft: 12 }} />
                        <Text style={s.metaText}>{listing.locationType === 'REMOTE' ? 'Remote' : listing.city ?? 'Vor Ort'}</Text>
                    </View>
                </View>

                {/* Was ich anbiete */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <Ionicons name="hand-left-outline" size={20} color={colors.teal} />
                        <Text style={s.sectionTitle}>Was ich anbiete</Text>
                    </View>
                    <Text style={s.description}>{listing.description}</Text>
                    <View style={s.detailRow}>
                        <View style={s.detailItem}>
                            <Text style={s.detailLabel}>Aufwand</Text>
                            <Text style={s.detailValue}>{EFFORT_LABELS[listing.effort] ?? listing.effort}</Text>
                        </View>
                        <View style={s.detailItem}>
                            <Text style={s.detailLabel}>Erfahrung</Text>
                            <Text style={s.detailValue}>{EXPERIENCE_LABELS[listing.experienceLevel] ?? listing.experienceLevel}</Text>
                        </View>
                    </View>
                </View>

                {/* Was ich suche */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <Ionicons name="search-outline" size={20} color={colors.teal} />
                        <Text style={s.sectionTitle}>Was ich suche</Text>
                    </View>
                    <View style={s.soughtRow}>
                        {soughtCategories.map((sc: any) => (
                            <View key={sc.category?.id ?? sc.id} style={s.soughtBadge}>
                                <Text style={s.soughtBadgeText}>{sc.category?.name ?? sc.name}</Text>
                            </View>
                        ))}
                    </View>
                    {listing.soughtDescription ? (
                        <Text style={s.description}>{listing.soughtDescription}</Text>
                    ) : null}
                </View>

                {/* Anforderungen */}
                {listing.requirements ? (
                    <View style={s.section}>
                        <View style={s.sectionHeader}>
                            <Ionicons name="clipboard-outline" size={20} color={colors.teal} />
                            <Text style={s.sectionTitle}>Anforderungen</Text>
                        </View>
                        <Text style={s.description}>{listing.requirements}</Text>
                    </View>
                ) : null}

                {/* Anbieter-Karte */}
                <View style={s.providerCard}>
                    <View style={s.providerAvatar}>
                        <Text style={s.providerAvatarText}>
                            {(user.firstName?.[0] ?? '?').toUpperCase()}
                        </Text>
                    </View>
                    <View style={s.providerInfo}>
                        <Text style={s.providerName}>
                            {user.firstName ?? 'Unbekannt'} {user.lastName?.[0] ? `${user.lastName[0]}.` : ''}
                        </Text>
                        <View style={s.providerBadges}>
                            {isVerified && (
                                <View style={s.verifiedBadge}>
                                    <Ionicons name="checkmark-circle" size={14} color={colors.teal} />
                                    <Text style={s.verifiedText}>Verifiziert</Text>
                                </View>
                            )}
                            {isIdVerified && (
                                <View style={s.verifiedBadge}>
                                    <Ionicons name="shield-checkmark" size={14} color={colors.success} />
                                    <Text style={s.verifiedText}>ID verifiziert</Text>
                                </View>
                            )}
                        </View>
                        {memberSince ? (
                            <Text style={s.memberSince}>Mitglied seit {memberSince}</Text>
                        ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </View>

                {/* Info Banner */}
                <View style={s.infoBanner}>
                    <Ionicons name="swap-vertical" size={20} color={colors.teal} />
                    <Text style={s.infoBannerText}>Leistungstausch — Ohne Geld, ohne Waren.</Text>
                </View>
            </ScrollView>

            {/* Bottom Action Bar */}
            <View style={s.bottomBar}>
                <TouchableOpacity
                    style={s.messageButton}
                    onPress={() => navigation.navigate('Chat', { listingId: listing.id, sellerId: user.id })}
                    activeOpacity={0.8}
                >
                    <Ionicons name="chatbubble-outline" size={20} color={colors.teal} />
                    <Text style={s.messageButtonText}>Nachricht senden</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={s.proposalButton}
                    onPress={() => navigation.navigate('ServiceProposal', {
                        listingId: listing.id,
                        listingTitle: listing.title,
                        soughtCategories: soughtCategories.map((sc: any) => sc.category ?? sc),
                    })}
                    activeOpacity={0.8}
                >
                    <Ionicons name="swap-horizontal-outline" size={20} color={colors.white} />
                    <Text style={s.proposalButtonText}>Vorschlag senden</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
    errorText: { fontSize: fontSize.base, color: colors.textMuted },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.tealDark,
    },
    topBtn: { padding: spacing.xs },
    topTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.white },
    scrollContent: { paddingBottom: spacing.xxl },
    headerCard: {
        backgroundColor: colors.teal,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xl,
        gap: spacing.sm,
    },
    categoryBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    categoryBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.white },
    title: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.white },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    metaText: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.7)' },
    section: {
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.navy },
    description: { fontSize: fontSize.base, color: colors.text, lineHeight: 22 },
    detailRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
    detailItem: { gap: spacing.xs },
    detailLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.textMuted },
    detailValue: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
    soughtRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
    soughtBadge: {
        backgroundColor: colors.teal50,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.tealLight,
    },
    soughtBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.teal700 },
    providerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: spacing.md,
    },
    providerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.tealLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    providerAvatarText: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.teal },
    providerInfo: { flex: 1, gap: spacing.xs },
    providerName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
    providerBadges: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    verifiedText: { fontSize: fontSize.xs, color: colors.teal },
    memberSince: { fontSize: fontSize.xs, color: colors.textMuted },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        margin: spacing.lg,
        backgroundColor: colors.teal50,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.tealLight,
    },
    infoBannerText: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.teal800 },
    bottomBar: {
        flexDirection: 'row',
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: spacing.sm,
    },
    messageButton: {
        flex: 1,
        flexDirection: 'row',
        height: 50,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: colors.teal,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    messageButtonText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.teal },
    proposalButton: {
        flex: 1.5,
        flexDirection: 'row',
        height: 50,
        borderRadius: borderRadius.md,
        backgroundColor: colors.teal,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    proposalButtonText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.white },
});
