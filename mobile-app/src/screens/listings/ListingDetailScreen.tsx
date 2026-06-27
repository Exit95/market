import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Image,
    Dimensions,
    ActivityIndicator,
    Alert,
    Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';
import { statusColors, trustLevelColors } from '../../theme';
import { get, post } from '../../api/client';
import type { Listing, TrustLevel } from '../../types';

type Props = NativeStackScreenProps<any, 'ListingDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TRUST_LABELS: Record<TrustLevel, string> = {
    NEW: 'Neu',
    BASIC: 'Basis',
    VERIFIED: 'Verifiziert',
    TRUSTED: 'Vertrauenswürdig',
    ELITE: 'Elite',
};

export default function ListingDetailScreen({ navigation, route }: Props) {
    const { id } = route.params as { id: string };
    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isFavorite, setIsFavorite] = useState(false);
    const scrollRef = useRef<ScrollView>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await get<{ listing: Listing }>(`/api/listings/${id}`);
                if (res.ok) setListing(res.data.listing);
            } catch {
                Alert.alert('Fehler', 'Anzeige konnte nicht geladen werden.');
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const formatPrice = (cents: number) =>
        new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

    const handleShare = async () => {
        if (!listing) return;
        try {
            await Share.share({
                message: `${listing.title} — ${formatPrice(listing.price)} auf Ehren-Deal\nhttps://ehren-deal.de/inserat/${listing.id}`,
            });
        } catch { /* user cancelled */ }
    };

    const handleContact = () => {
        if (!listing) return;
        navigation.navigate('Chat', { listingId: listing.id, sellerId: listing.seller.id });
    };

    const handleBuy = () => {
        if (!listing) return;
        navigation.navigate('Checkout', { listingId: listing.id });
    };

    const handleToggleFavorite = async () => {
        if (!listing) return;
        setIsFavorite(!isFavorite);
        try {
            await post(`/api/listings/${listing.id}/favorite`, { favorite: !isFavorite });
        } catch {
            setIsFavorite(isFavorite);
        }
    };

    const onImageScroll = (event: any) => {
        const x = event.nativeEvent.contentOffset.x;
        const index = Math.round(x / SCREEN_WIDTH);
        setActiveImageIndex(index);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!listing) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
                    <Text style={styles.errorText}>Anzeige nicht gefunden</Text>
                </View>
            </SafeAreaView>
        );
    }

    const trustLevel = listing.seller.trustScore?.level ?? 'NEW';
    const trustColor = trustLevelColors[trustLevel];

    return (
        <SafeAreaView style={styles.safe}>
            {/* Top Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.navy} />
                </TouchableOpacity>
                <View style={styles.topActions}>
                    <TouchableOpacity onPress={handleToggleFavorite} style={styles.topBtn}>
                        <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={24} color={isFavorite ? colors.danger : colors.navy} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleShare} style={styles.topBtn}>
                        <Ionicons name="share-outline" size={24} color={colors.navy} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Image Gallery */}
                <View style={styles.gallery}>
                    <ScrollView
                        ref={scrollRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={onImageScroll}
                    >
                        {listing.images.length > 0 ? (
                            listing.images.map((img, i) => (
                                <Image key={img.id} source={{ uri: img.url }} style={styles.galleryImage} />
                            ))
                        ) : (
                            <View style={[styles.galleryImage, styles.galleryPlaceholder]}>
                                <Ionicons name="image-outline" size={64} color={colors.textMuted} />
                            </View>
                        )}
                    </ScrollView>
                    {listing.images.length > 1 && (
                        <View style={styles.pagination}>
                            {listing.images.map((_, i) => (
                                <View
                                    key={i}
                                    style={[styles.paginationDot, i === activeImageIndex && styles.paginationDotActive]}
                                />
                            ))}
                        </View>
                    )}
                </View>

                {/* Price & Title */}
                <View style={styles.section}>
                    <Text style={styles.price}>{formatPrice(listing.price)}</Text>
                    <Text style={styles.title}>{listing.title}</Text>
                    <View style={styles.metaRow}>
                        <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.metaText}>{listing.city} {listing.postalCode}</Text>
                        <Text style={styles.metaDot}>·</Text>
                        <Ionicons name="eye-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.metaText}>{listing.viewCount} Aufrufe</Text>
                        <Text style={styles.metaDot}>·</Text>
                        <Text style={styles.metaText}>{formatDate(listing.createdAt)}</Text>
                    </View>
                    {listing.condition && (
                        <View style={styles.conditionBadge}>
                            <Text style={styles.conditionText}>{listing.condition}</Text>
                        </View>
                    )}
                </View>

                {/* Treuhand / Risk Reversal Box */}
                {listing.treuhand && (
                    <View style={styles.treuhandBox}>
                        <View style={styles.treuhandHeader}>
                            <Ionicons name="shield-checkmark" size={22} color={colors.success} />
                            <Text style={styles.treuhandTitle}>Ehren-Deal Treuhand-Schutz</Text>
                        </View>
                        <Text style={styles.treuhandDesc}>
                            Dein Geld wird sicher verwahrt und erst nach Erhalt und Prüfung der Ware an den Verkäufer ausgezahlt. Voller Käuferschutz bei Nichtlieferung oder Abweichung.
                        </Text>
                        <View style={styles.treuhandFeatures}>
                            {['Geld-zurück-Garantie', 'Sichere Zahlung', '14 Tage Prüfzeit'].map((f) => (
                                <View key={f} style={styles.treuhandFeature}>
                                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                                    <Text style={styles.treuhandFeatureText}>{f}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Seller Info */}
                <TouchableOpacity
                    style={styles.sellerCard}
                    onPress={() => navigation.navigate('PublicProfile', { id: listing.seller.id })}
                    activeOpacity={0.7}
                >
                    <View style={styles.sellerAvatar}>
                        <Text style={styles.sellerAvatarText}>
                            {(listing.seller.firstName?.[0] ?? '?').toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.sellerInfo}>
                        <Text style={styles.sellerName}>
                            {listing.seller.firstName} {listing.seller.lastName?.[0]}.
                        </Text>
                        <View style={styles.sellerMeta}>
                            <View style={[styles.trustBadge, { backgroundColor: trustColor + '20' }]}>
                                <Ionicons name="star" size={12} color={trustColor} />
                                <Text style={[styles.trustBadgeText, { color: trustColor }]}>
                                    {TRUST_LABELS[trustLevel]}
                                </Text>
                            </View>
                            {listing.seller.idVerified && (
                                <View style={styles.verifiedBadge}>
                                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                                    <Text style={styles.verifiedText}>ID verifiziert</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Description */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Beschreibung</Text>
                    <Text style={styles.description}>{listing.description}</Text>
                </View>
            </ScrollView>

            {/* Bottom Action Bar */}
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.contactButton} onPress={handleContact} activeOpacity={0.8}>
                    <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
                    <Text style={styles.contactButtonText}>Nachricht</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.buyButton} onPress={handleBuy} activeOpacity={0.8}>
                    <Ionicons name="cart-outline" size={20} color={colors.white} />
                    <Text style={styles.buyButtonText}>Kaufen</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
    errorText: { fontSize: fontSize.base, color: colors.textMuted },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    topBtn: { padding: spacing.xs },
    topActions: { flexDirection: 'row', gap: spacing.sm },
    scrollContent: { paddingBottom: spacing.xxl },
    gallery: { backgroundColor: colors.borderLight },
    galleryImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH * 0.75,
        resizeMode: 'cover',
    },
    galleryPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.borderLight,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        position: 'absolute',
        bottom: spacing.md,
        left: 0,
        right: 0,
        gap: spacing.xs,
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    paginationDotActive: {
        backgroundColor: colors.white,
        width: 20,
    },
    section: {
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    price: {
        fontSize: fontSize['2xl'],
        fontWeight: fontWeight.bold,
        color: colors.navy,
    },
    title: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.semibold,
        color: colors.text,
        marginTop: spacing.xs,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.sm,
        gap: spacing.xs,
        flexWrap: 'wrap',
    },
    metaText: { fontSize: fontSize.sm, color: colors.textMuted },
    metaDot: { fontSize: fontSize.sm, color: colors.textMuted },
    conditionBadge: {
        alignSelf: 'flex-start',
        marginTop: spacing.sm,
        backgroundColor: colors.primaryLight,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
    },
    conditionText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
    treuhandBox: {
        margin: spacing.lg,
        backgroundColor: colors.successLight,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.success + '30',
        gap: spacing.sm,
    },
    treuhandHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    treuhandTitle: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.success },
    treuhandDesc: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
    treuhandFeatures: { gap: spacing.xs },
    treuhandFeature: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    treuhandFeatureText: { fontSize: fontSize.sm, color: colors.text },
    sellerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: spacing.md,
    },
    sellerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sellerAvatarText: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.primary },
    sellerInfo: { flex: 1, gap: spacing.xs },
    sellerName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
    sellerMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    trustBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        gap: 3,
    },
    trustBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    verifiedText: { fontSize: fontSize.xs, color: colors.success },
    sectionTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.semibold,
        color: colors.navy,
        marginBottom: spacing.sm,
    },
    description: {
        fontSize: fontSize.base,
        color: colors.text,
        lineHeight: 22,
    },
    bottomBar: {
        flexDirection: 'row',
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: spacing.sm,
    },
    contactButton: {
        flex: 1,
        flexDirection: 'row',
        height: 50,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    contactButtonText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.primary },
    buyButton: {
        flex: 1.5,
        flexDirection: 'row',
        height: 50,
        borderRadius: borderRadius.md,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    buyButtonText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.white },
});
