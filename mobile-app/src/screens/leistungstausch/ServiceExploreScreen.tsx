import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ScrollView, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme';
import { spacing, borderRadius, fontSize, fontWeight } from '../../theme/spacing';

const API_BASE = 'https://ehren-deal.de';

const EFFORT_LABELS: Record<string, string> = {
    UNTER_1_STUNDE: '< 1 Std',
    EIN_BIS_DREI_STUNDEN: '1–3 Std',
    DREI_BIS_ACHT_STUNDEN: '3–8 Std',
    MEHRERE_TAGE: 'Mehrere Tage',
    FORTLAUFEND: 'Fortlaufend',
};

export default function ServiceExploreScreen() {
    const navigation = useNavigation<any>();
    const [listings, setListings] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [query, setQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const [catRes, listRes] = await Promise.all([
                fetch(`${API_BASE}/api/leistungstausch/categories`),
                fetch(`${API_BASE}/api/leistungstausch/listings?pageSize=20${query ? `&query=${encodeURIComponent(query)}` : ''}${activeCategory ? `&offeredCategory=${activeCategory}` : ''}`),
            ]);
            if (catRes.ok) { const d = await catRes.json(); setCategories(d.categories ?? []); }
            if (listRes.ok) { const d = await listRes.json(); setListings(d.listings ?? []); }
        } catch {}
        setLoading(false);
        setRefreshing(false);
    }, [query, activeCategory]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const onRefresh = () => { setRefreshing(true); fetchData(); };

    const renderCard = ({ item }: { item: any }) => {
        const isVerified = item.user?.emailVerified && item.user?.phoneVerified;
        const effortLabel = EFFORT_LABELS[item.effort] ?? item.effort;
        return (
            <TouchableOpacity style={s.card} onPress={() => navigation.navigate('ServiceDetail', { id: item.id })} activeOpacity={0.7}>
                <View style={s.cardImage}>
                    <Ionicons name="swap-vertical" size={32} color={colors.teal} />
                    <Text style={s.cardImageLabel}>{item.offeredCategory?.name}</Text>
                </View>
                <View style={s.cardBody}>
                    <View style={s.cardBadgeRow}>
                        <View style={s.badge}><Text style={s.badgeText}>{item.offeredCategory?.name}</Text></View>
                        {isVerified && <Ionicons name="checkmark-circle" size={14} color={colors.teal} />}
                    </View>
                    <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
                    <View style={s.cardSoughtRow}>
                        {item.soughtCategories?.slice(0, 2).map((sc: any) => (
                            <View key={sc.category.id} style={s.soughtBadge}><Text style={s.soughtBadgeText}>{sc.category.name}</Text></View>
                        ))}
                    </View>
                    <View style={s.cardMeta}>
                        <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                        <Text style={s.metaText}>{effortLabel}</Text>
                        <Ionicons name={item.locationType === 'REMOTE' ? 'desktop-outline' : 'location-outline'} size={12} color={colors.textMuted} style={{ marginLeft: 8 }} />
                        <Text style={s.metaText}>{item.locationType === 'REMOTE' ? 'Remote' : item.city ?? 'Vor Ort'}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={s.container}>
            {/* Hero */}
            <View style={s.hero}>
                <Text style={s.heroSubline}>Dienstleistung gegen Dienstleistung</Text>
                <Text style={s.heroTitle}>Leistungstausch</Text>
                <Text style={s.heroDesc}>Biete was du kannst. Bekomme was du brauchst.</Text>
                <View style={s.searchRow}>
                    <TextInput style={s.searchInput} placeholder="Was suchst du?" placeholderTextColor={colors.textMuted} value={query} onChangeText={setQuery} onSubmitEditing={fetchData} returnKeyType="search" />
                    <TouchableOpacity style={s.searchBtn} onPress={fetchData}><Ionicons name="search" size={18} color={colors.white} /></TouchableOpacity>
                </View>
            </View>

            {/* Categories */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={s.catContent}>
                <TouchableOpacity style={[s.catPill, !activeCategory && s.catPillActive]} onPress={() => setActiveCategory('')}><Text style={[s.catPillText, !activeCategory && s.catPillTextActive]}>Alle</Text></TouchableOpacity>
                {categories.map(c => (
                    <TouchableOpacity key={c.id} style={[s.catPill, activeCategory === c.slug && s.catPillActive]} onPress={() => setActiveCategory(activeCategory === c.slug ? '' : c.slug)}>
                        <Text style={[s.catPillText, activeCategory === c.slug && s.catPillTextActive]}>{c.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Listings */}
            {loading ? (
                <ActivityIndicator size="large" color={colors.teal} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={listings}
                    keyExtractor={item => item.id}
                    renderItem={renderCard}
                    numColumns={1}
                    contentContainerStyle={s.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
                    ListEmptyComponent={
                        <View style={s.empty}>
                            <Ionicons name="swap-vertical" size={48} color={colors.tealLight} />
                            <Text style={s.emptyTitle}>Noch keine Angebote</Text>
                            <Text style={s.emptyDesc}>Sei der Erste!</Text>
                            <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('ServiceCreate')}>
                                <Text style={s.emptyBtnText}>Angebot erstellen</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            {/* FAB */}
            <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('ServiceCreate')} activeOpacity={0.8}>
                <Ionicons name="add" size={28} color={colors.white} />
            </TouchableOpacity>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    hero: { backgroundColor: colors.tealDark, paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.lg },
    heroSubline: { color: 'rgba(255,255,255,0.7)', fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginBottom: 4 },
    heroTitle: { color: colors.white, fontSize: fontSize['3xl'], fontWeight: fontWeight.bold, marginBottom: 4 },
    heroDesc: { color: 'rgba(255,255,255,0.7)', fontSize: fontSize.base, marginBottom: spacing.md },
    searchRow: { flexDirection: 'row', gap: spacing.sm },
    searchInput: { flex: 1, backgroundColor: colors.white, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: fontSize.base, color: colors.text },
    searchBtn: { backgroundColor: colors.teal, borderRadius: borderRadius.md, width: 48, alignItems: 'center', justifyContent: 'center' },
    catScroll: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    catContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
    catPill: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.background },
    catPillActive: { backgroundColor: colors.teal },
    catPillText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary },
    catPillTextActive: { color: colors.white },
    listContent: { padding: spacing.md, gap: spacing.md },
    card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    cardImage: { backgroundColor: colors.teal50, height: 100, alignItems: 'center', justifyContent: 'center' },
    cardImageLabel: { fontSize: fontSize.xs, color: colors.teal, fontWeight: fontWeight.medium, marginTop: 4 },
    cardBody: { padding: spacing.md },
    cardBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    badge: { backgroundColor: colors.tealLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: borderRadius.full },
    badgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.teal800 },
    cardTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.sm },
    cardSoughtRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: spacing.sm },
    soughtBadge: { backgroundColor: colors.teal50, paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full },
    soughtBadgeText: { fontSize: 11, fontWeight: fontWeight.medium, color: colors.teal700 },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: fontSize.xs, color: colors.textMuted },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: colors.text, marginTop: spacing.md },
    emptyDesc: { fontSize: fontSize.base, color: colors.textSecondary, marginTop: 4 },
    emptyBtn: { backgroundColor: colors.teal, paddingHorizontal: spacing.lg, paddingVertical: 12, borderRadius: borderRadius.md, marginTop: spacing.md },
    emptyBtnText: { color: colors.white, fontSize: fontSize.base, fontWeight: fontWeight.semibold },
    fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: colors.tealDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
});
