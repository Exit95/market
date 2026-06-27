import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    FlatList,
    ScrollView,
    Image,
    RefreshControl,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';
import { get } from '../../api/client';
import type { Listing, Category } from '../../types';

type Props = NativeStackScreenProps<any, 'Home'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = spacing.sm;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - CARD_GAP) / 2;

const CATEGORIES: { id: string; name: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'elektronik', name: 'Elektronik', icon: 'laptop-outline' },
    { id: 'mode-bekleidung', name: 'Mode', icon: 'shirt-outline' },
    { id: 'moebel-wohnen', name: 'Möbel', icon: 'bed-outline' },
    { id: 'fahrzeuge', name: 'Fahrzeuge', icon: 'car-outline' },
    { id: 'sport-freizeit', name: 'Sport', icon: 'football-outline' },
    { id: 'haushalt', name: 'Haushalt', icon: 'home-outline' },
    { id: 'spielzeug', name: 'Spielzeug', icon: 'game-controller-outline' },
    { id: 'buecher-medien', name: 'Bücher', icon: 'book-outline' },
    { id: 'mieten-kaufen', name: 'Mieten', icon: 'business-outline' },
];

export default function HomeScreen({ navigation }: Props) {
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchListings = useCallback(async () => {
        try {
            const res = await get<{ listings: Listing[] }>('/api/listings?limit=20&sort=newest');
            if (res.ok && res.data.listings) {
                setListings(res.data.listings);
            }
        } catch {
            // Silently handle error
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchListings();
    }, [fetchListings]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchListings();
    }, [fetchListings]);

    const handleSearch = () => {
        if (searchQuery.trim()) {
            navigation.navigate('Search', { query: searchQuery.trim() });
        }
    };

    const formatPrice = (cents: number) => {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
    };

    const renderCategoryItem = ({ id, name, icon }: typeof CATEGORIES[number]) => (
        <TouchableOpacity
            key={id}
            style={styles.categoryItem}
            onPress={() => navigation.navigate('Search', { category: id })}
            activeOpacity={0.7}
        >
            <View style={styles.categoryIcon}>
                <Ionicons name={icon} size={24} color={colors.primary} />
            </View>
            <Text style={styles.categoryName} numberOfLines={1}>{name}</Text>
        </TouchableOpacity>
    );

    const renderListingCard = ({ item }: { item: Listing }) => (
        <TouchableOpacity
            style={styles.listingCard}
            onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
            activeOpacity={0.8}
        >
            <View style={styles.listingImageWrap}>
                {item.images[0] ? (
                    <Image source={{ uri: item.images[0].url }} style={styles.listingImage} />
                ) : (
                    <View style={styles.listingImagePlaceholder}>
                        <Ionicons name="image-outline" size={32} color={colors.textMuted} />
                    </View>
                )}
                {item.treuhand && (
                    <View style={styles.treuhandBadge}>
                        <Ionicons name="shield-checkmark" size={12} color={colors.white} />
                        <Text style={styles.treuhandText}>Treuhand</Text>
                    </View>
                )}
            </View>
            <View style={styles.listingInfo}>
                <Text style={styles.listingTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.listingPrice}>{formatPrice(item.price)}</Text>
                <View style={styles.listingMeta}>
                    <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.listingCity}>{item.city}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const ListHeader = () => (
        <>
            {/* Search Bar */}
            <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={20} color={colors.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Was suchst du?"
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Categories */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Kategorien</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryList}
                >
                    {CATEGORIES.map(renderCategoryItem)}
                </ScrollView>
            </View>

            {/* Trust Banner */}
            <View style={styles.trustBanner}>
                <View style={styles.trustItem}>
                    <Ionicons name="shield-checkmark" size={20} color={colors.success} />
                    <Text style={styles.trustItemText}>Käuferschutz</Text>
                </View>
                <View style={styles.trustItem}>
                    <Ionicons name="lock-closed" size={20} color={colors.primary} />
                    <Text style={styles.trustItemText}>Treuhand-Service</Text>
                </View>
                <View style={styles.trustItem}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={styles.trustItemText}>Verifizierte Nutzer</Text>
                </View>
            </View>

            {/* Recent Listings Header */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Neueste Anzeigen</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Search', {})}>
                    <Text style={styles.seeAll}>Alle ansehen</Text>
                </TouchableOpacity>
            </View>
        </>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <Text style={styles.headerLogo}>Ehren-Deal</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => navigation.navigate('Merkliste')} style={styles.headerIcon}>
                        <Ionicons name="heart-outline" size={24} color={colors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.headerIcon}>
                        <Ionicons name="notifications-outline" size={24} color={colors.white} />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={listings}
                keyExtractor={(item) => item.id}
                renderItem={renderListingCard}
                numColumns={2}
                columnWrapperStyle={styles.listingRow}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={ListHeader}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="basket-outline" size={48} color={colors.textMuted} />
                        <Text style={styles.emptyText}>Noch keine Anzeigen vorhanden</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.navy,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    headerLogo: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: colors.white,
    },
    headerActions: { flexDirection: 'row', gap: spacing.md },
    headerIcon: { padding: spacing.xs },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        height: 46,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: fontSize.base,
        color: colors.text,
    },
    section: {
        marginTop: spacing.lg,
    },
    sectionTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.semibold,
        color: colors.navy,
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.sm,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    seeAll: {
        fontSize: fontSize.sm,
        color: colors.primary,
        fontWeight: fontWeight.medium,
    },
    categoryList: {
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
    },
    categoryItem: {
        alignItems: 'center',
        width: 72,
    },
    categoryIcon: {
        width: 56,
        height: 56,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
    },
    categoryName: {
        fontSize: fontSize.xs,
        color: colors.text,
        fontWeight: fontWeight.medium,
        textAlign: 'center',
    },
    trustBanner: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: colors.surface,
        marginHorizontal: spacing.lg,
        marginTop: spacing.lg,
        borderRadius: borderRadius.md,
        paddingVertical: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    trustItem: { alignItems: 'center', gap: spacing.xs },
    trustItemText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
    listContent: {
        paddingBottom: spacing.xxl,
    },
    listingRow: {
        paddingHorizontal: spacing.lg,
        gap: CARD_GAP,
        marginBottom: CARD_GAP,
    },
    listingCard: {
        width: CARD_WIDTH,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    listingImageWrap: {
        width: '100%',
        height: CARD_WIDTH * 0.75,
        backgroundColor: colors.borderLight,
    },
    listingImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    listingImagePlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    treuhandBadge: {
        position: 'absolute',
        top: spacing.xs,
        left: spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.success,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        gap: 3,
    },
    treuhandText: {
        fontSize: 10,
        fontWeight: fontWeight.semibold,
        color: colors.white,
    },
    listingInfo: {
        padding: spacing.sm,
        gap: 3,
    },
    listingTitle: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.text,
        lineHeight: 18,
    },
    listingPrice: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
        color: colors.navy,
    },
    listingMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: 2,
    },
    listingCity: {
        fontSize: fontSize.xs,
        color: colors.textMuted,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
        gap: spacing.sm,
    },
    emptyText: {
        fontSize: fontSize.base,
        color: colors.textMuted,
    },
});
