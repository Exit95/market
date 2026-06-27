import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    FlatList,
    Image,
    ActivityIndicator,
    Modal,
    ScrollView,
    Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';
import { get } from '../../api/client';
import type { Listing } from '../../types';

type Props = NativeStackScreenProps<any, 'Search'>;

const CATEGORIES = [
    { id: '', name: 'Alle Kategorien' },
    { id: 'elektronik', name: 'Elektronik' },
    { id: 'mode-bekleidung', name: 'Mode & Bekleidung' },
    { id: 'moebel-wohnen', name: 'Möbel & Wohnen' },
    { id: 'fahrzeuge', name: 'Fahrzeuge' },
    { id: 'sport-freizeit', name: 'Sport & Freizeit' },
    { id: 'haushalt', name: 'Haushalt' },
    { id: 'spielzeug', name: 'Spielzeug' },
    { id: 'buecher-medien', name: 'Bücher & Medien' },
    { id: 'mieten-kaufen', name: 'Mieten & Kaufen' },
];

const CONDITIONS = [
    { id: '', name: 'Alle' },
    { id: 'new', name: 'Neu' },
    { id: 'like_new', name: 'Wie neu' },
    { id: 'good', name: 'Gut' },
    { id: 'acceptable', name: 'Akzeptabel' },
];

export default function SearchScreen({ navigation, route }: Props) {
    const initialQuery = route.params?.query ?? '';
    const initialCategory = route.params?.category ?? '';

    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Filters
    const [category, setCategory] = useState(initialCategory);
    const [condition, setCondition] = useState('');
    const [priceMin, setPriceMin] = useState('');
    const [priceMax, setPriceMax] = useState('');
    const [treuhandOnly, setTreuhandOnly] = useState(false);
    const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');

    const search = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (query.trim()) params.set('q', query.trim());
            if (category) params.set('category', category);
            if (condition) params.set('condition', condition);
            if (priceMin) params.set('priceMin', String(Number(priceMin) * 100));
            if (priceMax) params.set('priceMax', String(Number(priceMax) * 100));
            if (treuhandOnly) params.set('treuhand', 'true');
            params.set('sort', sortBy);
            params.set('limit', '40');

            const res = await get<{ listings: Listing[] }>(`/api/listings?${params.toString()}`);
            if (res.ok && res.data.listings) {
                setResults(res.data.listings);
            }
        } catch {
            // Silently handle
        } finally {
            setLoading(false);
        }
    }, [query, category, condition, priceMin, priceMax, treuhandOnly, sortBy]);

    useEffect(() => {
        search();
    }, [search]);

    const formatPrice = (cents: number) =>
        new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);

    const activeFilterCount = [category, condition, priceMin, priceMax, treuhandOnly].filter(Boolean).length;

    const renderResult = ({ item }: { item: Listing }) => (
        <TouchableOpacity
            style={styles.resultCard}
            onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
            activeOpacity={0.8}
        >
            <View style={styles.resultImageWrap}>
                {item.images[0] ? (
                    <Image source={{ uri: item.images[0].url }} style={styles.resultImage} />
                ) : (
                    <View style={styles.resultImagePlaceholder}>
                        <Ionicons name="image-outline" size={24} color={colors.textMuted} />
                    </View>
                )}
            </View>
            <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.resultPrice}>{formatPrice(item.price)}</Text>
                <View style={styles.resultMeta}>
                    <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.resultCity}>{item.city}</Text>
                    {item.treuhand && (
                        <View style={styles.treuhandTag}>
                            <Ionicons name="shield-checkmark" size={10} color={colors.success} />
                            <Text style={styles.treuhandTagText}>Treuhand</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.resultCondition}>{item.condition ?? ''}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
    );

    const renderFilterChip = (label: string, active: boolean, onPress: () => void) => (
        <TouchableOpacity
            style={[styles.chip, active && styles.chipActive]}
            onPress={onPress}
            key={label}
        >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safe}>
            {/* Search Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.navy} />
                </TouchableOpacity>
                <View style={styles.searchBar}>
                    <Ionicons name="search-outline" size={18} color={colors.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Suche..."
                        placeholderTextColor={colors.textMuted}
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={search}
                        returnKeyType="search"
                        autoFocus={!initialQuery && !initialCategory}
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterBtn}>
                    <Ionicons name="options-outline" size={22} color={colors.primary} />
                    {activeFilterCount > 0 && (
                        <View style={styles.filterBadge}>
                            <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Sort Chips */}
            <View style={styles.sortRow}>
                {renderFilterChip('Neueste', sortBy === 'newest', () => setSortBy('newest'))}
                {renderFilterChip('Preis aufst.', sortBy === 'price_asc', () => setSortBy('price_asc'))}
                {renderFilterChip('Preis abst.', sortBy === 'price_desc', () => setSortBy('price_desc'))}
            </View>

            {/* Results */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={(item) => item.id}
                    renderItem={renderResult}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
                            <Text style={styles.emptyText}>Keine Ergebnisse gefunden</Text>
                            <Text style={styles.emptySubtext}>Versuche andere Suchbegriffe oder Filter</Text>
                        </View>
                    }
                    ListHeaderComponent={
                        results.length > 0 ? (
                            <Text style={styles.resultCount}>{results.length} Ergebnis{results.length !== 1 ? 'se' : ''}</Text>
                        ) : null
                    }
                />
            )}

            {/* Filter Modal */}
            <Modal visible={showFilters} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalSafe}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Filter</Text>
                        <TouchableOpacity onPress={() => setShowFilters(false)}>
                            <Ionicons name="close" size={24} color={colors.navy} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={styles.modalContent}>
                        {/* Category */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Kategorie</Text>
                            <View style={styles.chipWrap}>
                                {CATEGORIES.map((c) =>
                                    renderFilterChip(c.name, category === c.id, () => setCategory(c.id))
                                )}
                            </View>
                        </View>

                        {/* Condition */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Zustand</Text>
                            <View style={styles.chipWrap}>
                                {CONDITIONS.map((c) =>
                                    renderFilterChip(c.name, condition === c.id, () => setCondition(c.id))
                                )}
                            </View>
                        </View>

                        {/* Price Range */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Preisspanne</Text>
                            <View style={styles.priceRow}>
                                <View style={styles.priceInput}>
                                    <TextInput
                                        style={styles.priceField}
                                        placeholder="Min"
                                        placeholderTextColor={colors.textMuted}
                                        value={priceMin}
                                        onChangeText={setPriceMin}
                                        keyboardType="numeric"
                                    />
                                    <Text style={styles.priceUnit}>EUR</Text>
                                </View>
                                <Text style={styles.priceDash}>—</Text>
                                <View style={styles.priceInput}>
                                    <TextInput
                                        style={styles.priceField}
                                        placeholder="Max"
                                        placeholderTextColor={colors.textMuted}
                                        value={priceMax}
                                        onChangeText={setPriceMax}
                                        keyboardType="numeric"
                                    />
                                    <Text style={styles.priceUnit}>EUR</Text>
                                </View>
                            </View>
                        </View>

                        {/* Treuhand */}
                        <View style={styles.filterSection}>
                            <View style={styles.switchRow}>
                                <View style={styles.switchLabel}>
                                    <Ionicons name="shield-checkmark" size={20} color={colors.success} />
                                    <Text style={styles.filterLabel}>Nur mit Treuhand-Schutz</Text>
                                </View>
                                <Switch
                                    value={treuhandOnly}
                                    onValueChange={setTreuhandOnly}
                                    trackColor={{ true: colors.success, false: colors.border }}
                                    thumbColor={colors.white}
                                />
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.resetButton}
                            onPress={() => { setCategory(''); setCondition(''); setPriceMin(''); setPriceMax(''); setTreuhandOnly(false); }}
                        >
                            <Text style={styles.resetText}>Zurücksetzen</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.applyButton}
                            onPress={() => { setShowFilters(false); search(); }}
                        >
                            <Text style={styles.applyText}>Filter anwenden</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: spacing.sm,
    },
    backBtn: { padding: spacing.xs },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.sm,
        height: 40,
        gap: spacing.xs,
    },
    searchInput: { flex: 1, fontSize: fontSize.base, color: colors.text },
    filterBtn: { padding: spacing.xs, position: 'relative' },
    filterBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.danger,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterBadgeText: { fontSize: 9, fontWeight: fontWeight.bold, color: colors.white },
    sortRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        gap: spacing.sm,
    },
    chip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: fontSize.sm, color: colors.textSecondary },
    chipTextActive: { color: colors.white, fontWeight: fontWeight.medium },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
    listContent: { paddingBottom: spacing.xxl },
    resultCount: {
        fontSize: fontSize.sm,
        color: colors.textMuted,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    resultCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.sm,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.sm,
        gap: spacing.sm,
    },
    resultImageWrap: {
        width: 80,
        height: 80,
        borderRadius: borderRadius.sm,
        overflow: 'hidden',
        backgroundColor: colors.borderLight,
    },
    resultImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    resultImagePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
    resultInfo: { flex: 1, gap: 2 },
    resultTitle: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
    resultPrice: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.navy },
    resultMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    resultCity: { fontSize: fontSize.xs, color: colors.textMuted },
    treuhandTag: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: spacing.sm },
    treuhandTagText: { fontSize: fontSize.xs, color: colors.success, fontWeight: fontWeight.medium },
    resultCondition: { fontSize: fontSize.xs, color: colors.textMuted },
    emptyText: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.text, marginTop: spacing.md },
    emptySubtext: { fontSize: fontSize.sm, color: colors.textMuted },
    // Filter Modal
    modalSafe: { flex: 1, backgroundColor: colors.background },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.navy },
    modalContent: { padding: spacing.lg, gap: spacing.lg },
    filterSection: { gap: spacing.sm },
    filterLabel: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    priceInput: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        height: 44,
    },
    priceField: { flex: 1, fontSize: fontSize.base, color: colors.text },
    priceUnit: { fontSize: fontSize.sm, color: colors.textMuted },
    priceDash: { fontSize: fontSize.lg, color: colors.textMuted },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    switchLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    modalFooter: {
        flexDirection: 'row',
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: spacing.md,
    },
    resetButton: {
        flex: 1,
        height: 48,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resetText: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.textSecondary },
    applyButton: {
        flex: 2,
        height: 48,
        borderRadius: borderRadius.md,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    applyText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.white },
});
