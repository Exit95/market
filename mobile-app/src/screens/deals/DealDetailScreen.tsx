import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Image,
    ActivityIndicator,
    Alert,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';
import { statusColors } from '../../theme';
import { get, post } from '../../api/client';
import type { Deal, DealStatus } from '../../types';

type Props = NativeStackScreenProps<any, 'DealDetail'>;

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

const TIMELINE_STEPS: { status: DealStatus; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { status: 'PAID', label: 'Bezahlt', icon: 'card-outline' },
    { status: 'SHIPPED', label: 'Versendet', icon: 'airplane-outline' },
    { status: 'DELIVERED', label: 'Geliefert', icon: 'cube-outline' },
    { status: 'COMPLETED', label: 'Abgeschlossen', icon: 'shield-checkmark-outline' },
];

const STATUS_ORDER: DealStatus[] = ['PENDING', 'PAYMENT_PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED'];

export default function DealDetailScreen({ navigation, route }: Props) {
    const { id } = route.params as { id: string };
    const [deal, setDeal] = useState<Deal | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState('');
    const [trackingCode, setTrackingCode] = useState('');
    const [carrier, setCarrier] = useState('');
    const [showShipForm, setShowShipForm] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const [dealRes, meRes] = await Promise.all([
                    get<{ deal: Deal }>(`/api/deals/${id}`),
                    get<{ user: { id: string } }>('/api/auth/me'),
                ]);
                if (dealRes.ok) setDeal(dealRes.data.deal);
                if (meRes.ok) setCurrentUserId(meRes.data.user.id);
            } catch {
                Alert.alert('Fehler', 'Deal konnte nicht geladen werden.');
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const isBuyer = deal?.buyerId === currentUserId;
    const isSeller = deal?.sellerId === currentUserId;

    const formatPrice = (cents: number) =>
        new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const getStepIndex = (status: DealStatus): number => STATUS_ORDER.indexOf(status);

    const handleAction = async (action: string, payload?: any) => {
        if (!deal) return;
        setActionLoading(true);
        try {
            const res = await post(`/api/deals/${deal.id}/${action}`, payload);
            if (res.ok) {
                const refreshed = await get<{ deal: Deal }>(`/api/deals/${deal.id}`);
                if (refreshed.ok) setDeal(refreshed.data.deal);
            } else {
                Alert.alert('Fehler', 'Aktion konnte nicht ausgeführt werden.');
            }
        } catch {
            Alert.alert('Fehler', 'Verbindungsfehler.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleShip = () => {
        if (!trackingCode.trim()) {
            Alert.alert('Fehler', 'Bitte gib eine Sendungsnummer ein.');
            return;
        }
        handleAction('ship', { trackingCode, carrier });
        setShowShipForm(false);
    };

    const renderTimeline = () => {
        if (!deal) return null;
        const currentIdx = getStepIndex(deal.status);

        return (
            <View style={styles.timeline}>
                {TIMELINE_STEPS.map((step, i) => {
                    const stepIdx = getStepIndex(step.status);
                    const isDone = currentIdx >= stepIdx;
                    const isCurrent = deal.status === step.status;
                    const color = isDone ? colors.success : colors.border;

                    return (
                        <View key={step.status} style={styles.timelineStep}>
                            <View style={styles.timelineLeft}>
                                <View style={[styles.timelineDot, { backgroundColor: isDone ? colors.success : colors.surface, borderColor: color }]}>
                                    {isDone ? (
                                        <Ionicons name="checkmark" size={14} color={colors.white} />
                                    ) : (
                                        <Ionicons name={step.icon} size={14} color={colors.textMuted} />
                                    )}
                                </View>
                                {i < TIMELINE_STEPS.length - 1 && (
                                    <View style={[styles.timelineLine, { backgroundColor: currentIdx > stepIdx ? colors.success : colors.border }]} />
                                )}
                            </View>
                            <View style={styles.timelineContent}>
                                <Text style={[styles.timelineLabel, isDone && styles.timelineLabelDone, isCurrent && styles.timelineLabelCurrent]}>
                                    {step.label}
                                </Text>
                                {isCurrent && (
                                    <Text style={styles.timelineHint}>Aktueller Status</Text>
                                )}
                            </View>
                        </View>
                    );
                })}
            </View>
        );
    };

    const renderActions = () => {
        if (!deal) return null;

        const actions: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; variant: 'primary' | 'success' | 'danger' }[] = [];

        if (isSeller && deal.status === 'PAID') {
            actions.push({
                label: 'Als versendet markieren',
                icon: 'airplane-outline',
                onPress: () => setShowShipForm(true),
                variant: 'primary',
            });
        }

        if (isBuyer && deal.status === 'SHIPPED') {
            actions.push({
                label: 'Erhalt bestätigen',
                icon: 'cube-outline',
                onPress: () => Alert.alert(
                    'Erhalt bestätigen',
                    'Hast du den Artikel erhalten und geprüft?',
                    [
                        { text: 'Abbrechen', style: 'cancel' },
                        { text: 'Ja, erhalten', onPress: () => handleAction('confirm-delivery') },
                    ],
                ),
                variant: 'success',
            });
        }

        if (isBuyer && deal.status === 'DELIVERED') {
            actions.push({
                label: 'Deal abschließen',
                icon: 'shield-checkmark-outline',
                onPress: () => Alert.alert(
                    'Deal abschließen',
                    'Damit wird die Zahlung an den Verkäufer freigegeben.',
                    [
                        { text: 'Abbrechen', style: 'cancel' },
                        { text: 'Abschließen', onPress: () => handleAction('complete') },
                    ],
                ),
                variant: 'success',
            });
        }

        if ((isBuyer || isSeller) && ['PAID', 'SHIPPED'].includes(deal.status)) {
            actions.push({
                label: 'Problem melden',
                icon: 'warning-outline',
                onPress: () => Alert.alert(
                    'Problem melden',
                    'Möchtest du einen Streitfall eröffnen?',
                    [
                        { text: 'Abbrechen', style: 'cancel' },
                        { text: 'Melden', style: 'destructive', onPress: () => handleAction('dispute') },
                    ],
                ),
                variant: 'danger',
            });
        }

        if (actions.length === 0) return null;

        return (
            <View style={styles.actionsSection}>
                {actions.map((action) => {
                    const bgColor = action.variant === 'primary' ? colors.primary : action.variant === 'success' ? colors.success : colors.danger;
                    return (
                        <TouchableOpacity
                            key={action.label}
                            style={[styles.actionButton, { backgroundColor: bgColor }]}
                            onPress={action.onPress}
                            disabled={actionLoading}
                            activeOpacity={0.8}
                        >
                            {actionLoading ? (
                                <ActivityIndicator color={colors.white} />
                            ) : (
                                <>
                                    <Ionicons name={action.icon} size={20} color={colors.white} />
                                    <Text style={styles.actionButtonText}>{action.label}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
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

    if (!deal) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
                    <Text style={styles.errorText}>Deal nicht gefunden</Text>
                </View>
            </SafeAreaView>
        );
    }

    const statusColor = statusColors[deal.status] ?? colors.textMuted;

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.navy} />
                </TouchableOpacity>
                <Text style={styles.topTitle}>Deal-Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Status Header */}
                <View style={[styles.statusHeader, { backgroundColor: statusColor + '10' }]}>
                    <View style={[styles.statusBadgeLarge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                            {STATUS_LABELS[deal.status]}
                        </Text>
                    </View>
                    <Text style={styles.statusDate}>Erstellt am {formatDate(deal.createdAt)}</Text>
                </View>

                {/* Timeline */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Status-Verlauf</Text>
                    {renderTimeline()}
                </View>

                {/* Shipping form */}
                {showShipForm && (
                    <View style={styles.shipForm}>
                        <Text style={styles.sectionTitle}>Versanddetails</Text>
                        <TextInput
                            style={styles.shipInput}
                            placeholder="Sendungsnummer"
                            placeholderTextColor={colors.textMuted}
                            value={trackingCode}
                            onChangeText={setTrackingCode}
                        />
                        <TextInput
                            style={styles.shipInput}
                            placeholder="Versanddienstleister (z.B. DHL, Hermes)"
                            placeholderTextColor={colors.textMuted}
                            value={carrier}
                            onChangeText={setCarrier}
                        />
                        <View style={styles.shipActions}>
                            <TouchableOpacity style={styles.shipCancel} onPress={() => setShowShipForm(false)}>
                                <Text style={styles.shipCancelText}>Abbrechen</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.shipConfirm} onPress={handleShip} disabled={actionLoading}>
                                {actionLoading ? (
                                    <ActivityIndicator color={colors.white} />
                                ) : (
                                    <Text style={styles.shipConfirmText}>Versand bestätigen</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Listing Info */}
                <TouchableOpacity
                    style={styles.listingCard}
                    onPress={() => navigation.navigate('ListingDetail', { id: deal.listingId })}
                    activeOpacity={0.7}
                >
                    <View style={styles.listingImageWrap}>
                        {deal.listing.images?.[0] ? (
                            <Image source={{ uri: deal.listing.images[0].url }} style={styles.listingImage} />
                        ) : (
                            <View style={styles.listingImagePlaceholder}>
                                <Ionicons name="image-outline" size={24} color={colors.textMuted} />
                            </View>
                        )}
                    </View>
                    <View style={styles.listingInfo}>
                        <Text style={styles.listingTitle}>{deal.listing.title}</Text>
                        <Text style={styles.listingPrice}>{formatPrice(deal.totalAmount)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Tracking */}
                {deal.trackingCode && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Sendungsverfolgung</Text>
                        <View style={styles.trackingCard}>
                            <Ionicons name="airplane-outline" size={20} color={colors.primary} />
                            <View style={styles.trackingInfo}>
                                <Text style={styles.trackingCode}>{deal.trackingCode}</Text>
                                {deal.carrier && <Text style={styles.trackingCarrier}>{deal.carrier}</Text>}
                            </View>
                        </View>
                    </View>
                )}

                {/* Buyer/Seller Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{isBuyer ? 'Verkäufer' : 'Käufer'}</Text>
                    <View style={styles.partyCard}>
                        <View style={styles.partyAvatar}>
                            <Text style={styles.partyAvatarText}>
                                {((isBuyer ? deal.seller : deal.buyer).firstName?.[0] ?? '?').toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.partyInfo}>
                            <Text style={styles.partyName}>
                                {(isBuyer ? deal.seller : deal.buyer).firstName}{' '}
                                {(isBuyer ? deal.seller : deal.buyer).lastName?.[0]}.
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.messageBtn}
                            onPress={() => navigation.navigate('Chat', {
                                listingId: deal.listingId,
                                sellerId: deal.sellerId,
                            })}
                        >
                            <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                            <Text style={styles.messageBtnText}>Nachricht</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Actions */}
                {renderActions()}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
    errorText: { fontSize: fontSize.base, color: colors.textMuted },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    topBtn: { padding: spacing.xs },
    topTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.navy },
    scrollContent: { paddingBottom: spacing.xxl },
    statusHeader: {
        padding: spacing.lg,
        alignItems: 'center',
        gap: spacing.sm,
    },
    statusBadgeLarge: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    statusBadgeText: { fontSize: fontSize.base, fontWeight: fontWeight.bold },
    statusDate: { fontSize: fontSize.sm, color: colors.textMuted },
    section: {
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sectionTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.semibold,
        color: colors.navy,
        marginBottom: spacing.md,
    },
    timeline: { gap: 0 },
    timelineStep: { flexDirection: 'row', minHeight: 52 },
    timelineLeft: { alignItems: 'center', width: 32 },
    timelineDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timelineLine: { width: 2, flex: 1, marginVertical: 2 },
    timelineContent: { marginLeft: spacing.md, paddingBottom: spacing.md, flex: 1 },
    timelineLabel: { fontSize: fontSize.base, color: colors.textMuted },
    timelineLabelDone: { color: colors.success, fontWeight: fontWeight.medium },
    timelineLabelCurrent: { color: colors.primary, fontWeight: fontWeight.bold },
    timelineHint: { fontSize: fontSize.xs, color: colors.primary, marginTop: 2 },
    shipForm: {
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: spacing.sm,
    },
    shipInput: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        height: 46,
        fontSize: fontSize.base,
        color: colors.text,
    },
    shipActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
    shipCancel: {
        flex: 1,
        height: 44,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    shipCancelText: { fontSize: fontSize.base, color: colors.textSecondary },
    shipConfirm: {
        flex: 2,
        height: 44,
        borderRadius: borderRadius.md,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    shipConfirmText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.white },
    listingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: spacing.md,
    },
    listingImageWrap: {
        width: 64,
        height: 64,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        backgroundColor: colors.borderLight,
    },
    listingImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    listingImagePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
    listingInfo: { flex: 1 },
    listingTitle: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
    listingPrice: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.navy, marginTop: 2 },
    trackingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primaryLight,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        gap: spacing.md,
    },
    trackingInfo: { flex: 1 },
    trackingCode: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.navy },
    trackingCarrier: { fontSize: fontSize.sm, color: colors.textMuted },
    partyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    partyAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    partyAvatarText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.primary },
    partyInfo: { flex: 1 },
    partyName: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
    messageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    messageBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
    actionsSection: {
        padding: spacing.lg,
        gap: spacing.sm,
    },
    actionButton: {
        flexDirection: 'row',
        height: 50,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    actionButtonText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.white },
});
