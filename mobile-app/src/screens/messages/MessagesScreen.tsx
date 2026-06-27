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
import { get } from '../../api/client';
import type { Conversation } from '../../types';

type Props = NativeStackScreenProps<any, 'Messages'>;

export default function MessagesScreen({ navigation }: Props) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string>('');

    const fetchConversations = useCallback(async () => {
        try {
            const [convRes, meRes] = await Promise.all([
                get<{ conversations: Conversation[] }>('/api/messages'),
                get<{ user: { id: string } }>('/api/auth/me'),
            ]);
            if (convRes.ok && convRes.data.conversations) {
                setConversations(convRes.data.conversations);
            }
            if (meRes.ok) {
                setCurrentUserId(meRes.data.user.id);
            }
        } catch {
            // silently handle
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchConversations();
        });
        return unsubscribe;
    }, [navigation, fetchConversations]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchConversations();
    }, [fetchConversations]);

    const getOtherUser = (conv: Conversation) => {
        return conv.buyerId === currentUserId ? conv.seller : conv.buyer;
    };

    const getLastMessage = (conv: Conversation) => {
        if (conv.messages.length === 0) return null;
        return conv.messages[conv.messages.length - 1];
    };

    const formatTime = (iso: string) => {
        const date = new Date(iso);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Gestern';
        } else if (diffDays < 7) {
            return date.toLocaleDateString('de-DE', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        }
    };

    const formatPrice = (cents: number) =>
        new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);

    const hasUnread = (conv: Conversation) => {
        const last = getLastMessage(conv);
        return last ? last.senderId !== currentUserId : false;
    };

    const renderConversation = ({ item }: { item: Conversation }) => {
        const other = getOtherUser(item);
        const lastMsg = getLastMessage(item);
        const unread = hasUnread(item);

        return (
            <TouchableOpacity
                style={[styles.convCard, unread && styles.convCardUnread]}
                onPress={() => navigation.navigate('Chat', { conversationId: item.id })}
                activeOpacity={0.7}
            >
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                    {other.avatarUrl ? (
                        <Image source={{ uri: other.avatarUrl }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarFallback}>
                            <Text style={styles.avatarText}>
                                {(other.firstName?.[0] ?? '?').toUpperCase()}
                            </Text>
                        </View>
                    )}
                    {unread && <View style={styles.unreadDot} />}
                </View>

                {/* Content */}
                <View style={styles.convContent}>
                    <View style={styles.convHeader}>
                        <Text style={[styles.convName, unread && styles.convNameUnread]} numberOfLines={1}>
                            {other.firstName} {other.lastName?.[0]}.
                        </Text>
                        {lastMsg && (
                            <Text style={styles.convTime}>{formatTime(lastMsg.createdAt)}</Text>
                        )}
                    </View>

                    {/* Listing info */}
                    <View style={styles.listingRow}>
                        {item.listing.images?.[0] && (
                            <Image source={{ uri: item.listing.images[0].url }} style={styles.listingThumb} />
                        )}
                        <Text style={styles.listingTitle} numberOfLines={1}>
                            {item.listing.title}
                        </Text>
                        <Text style={styles.listingPrice}>{formatPrice(item.listing.price)}</Text>
                    </View>

                    {/* Last message */}
                    {lastMsg && (
                        <Text style={[styles.convMessage, unread && styles.convMessageUnread]} numberOfLines={1}>
                            {lastMsg.senderId === currentUserId ? 'Du: ' : ''}
                            {lastMsg.body}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Nachrichten</Text>
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
                <Text style={styles.headerTitle}>Nachrichten</Text>
            </View>

            {/* Security Banner */}
            <View style={styles.securityBanner}>
                <Ionicons name="shield-checkmark" size={14} color={colors.success} />
                <Text style={styles.securityText}>
                    Alle Nachrichten werden verschlüsselt übertragen
                </Text>
            </View>

            <FlatList
                data={conversations}
                keyExtractor={(item) => item.id}
                renderItem={renderConversation}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="chatbubbles-outline" size={56} color={colors.textMuted} />
                        <Text style={styles.emptyTitle}>Keine Nachrichten</Text>
                        <Text style={styles.emptySubtitle}>
                            Kontaktiere einen Verkäufer um eine Unterhaltung zu starten
                        </Text>
                        <TouchableOpacity
                            style={styles.browseButton}
                            onPress={() => navigation.navigate('Home')}
                        >
                            <Text style={styles.browseButtonText}>Anzeigen durchsuchen</Text>
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
    securityBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.successLight,
        paddingVertical: spacing.xs,
        gap: spacing.xs,
    },
    securityText: { fontSize: fontSize.xs, color: colors.success },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    listContent: { paddingBottom: spacing.xxl },
    convCard: {
        flexDirection: 'row',
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: spacing.md,
    },
    convCardUnread: {
        backgroundColor: colors.primaryLight,
    },
    avatarContainer: { position: 'relative' },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    avatarFallback: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: colors.primary,
    },
    unreadDot: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: colors.primary,
        borderWidth: 2,
        borderColor: colors.surface,
    },
    convContent: { flex: 1, gap: 4 },
    convHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    convName: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.medium,
        color: colors.text,
        flex: 1,
    },
    convNameUnread: { fontWeight: fontWeight.bold },
    convTime: { fontSize: fontSize.xs, color: colors.textMuted },
    listingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    listingThumb: {
        width: 20,
        height: 20,
        borderRadius: 3,
    },
    listingTitle: {
        flex: 1,
        fontSize: fontSize.xs,
        color: colors.textMuted,
    },
    listingPrice: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
        color: colors.navy,
    },
    convMessage: {
        fontSize: fontSize.sm,
        color: colors.textMuted,
        lineHeight: 18,
    },
    convMessageUnread: {
        color: colors.text,
        fontWeight: fontWeight.medium,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl * 2,
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
    },
    emptyTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.semibold,
        color: colors.text,
    },
    emptySubtitle: {
        fontSize: fontSize.base,
        color: colors.textMuted,
        textAlign: 'center',
    },
    browseButton: {
        marginTop: spacing.md,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    browseButtonText: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.white,
    },
});
