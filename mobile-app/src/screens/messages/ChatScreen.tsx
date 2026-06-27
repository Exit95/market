import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';
import { get, post } from '../../api/client';
import type { Conversation, Message } from '../../types';

type Props = NativeStackScreenProps<any, 'Chat'>;

export default function ChatScreen({ navigation, route }: Props) {
    const { conversationId, listingId, sellerId } = route.params as {
        conversationId?: string;
        listingId?: string;
        sellerId?: string;
    };

    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [inputText, setInputText] = useState('');
    const [currentUserId, setCurrentUserId] = useState('');
    const flatListRef = useRef<FlatList>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchConversation = useCallback(async () => {
        try {
            let convId = conversationId;

            // If no conversationId, create/get conversation for listing
            if (!convId && listingId) {
                const res = await post<{ conversation: Conversation }>('/api/messages/conversations', {
                    listingId,
                    sellerId,
                });
                if (res.ok) convId = res.data.conversation.id;
            }
            if (!convId) return;

            const [convRes, meRes] = await Promise.all([
                get<{ conversation: Conversation }>(`/api/messages/${convId}`),
                get<{ user: { id: string } }>('/api/auth/me'),
            ]);

            if (convRes.ok) {
                setConversation(convRes.data.conversation);
                setMessages(convRes.data.conversation.messages || []);
            }
            if (meRes.ok) {
                setCurrentUserId(meRes.data.user.id);
            }
        } catch {
            // silently handle
        } finally {
            setLoading(false);
        }
    }, [conversationId, listingId, sellerId]);

    useEffect(() => {
        fetchConversation();
    }, [fetchConversation]);

    // Poll for new messages
    useEffect(() => {
        pollRef.current = setInterval(() => {
            if (conversation?.id) {
                get<{ conversation: Conversation }>(`/api/messages/${conversation.id}`).then((res) => {
                    if (res.ok && res.data.conversation.messages) {
                        setMessages(res.data.conversation.messages);
                    }
                });
            }
        }, 5000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [conversation?.id]);

    const handleSend = async () => {
        const body = inputText.trim();
        if (!body || !conversation?.id) return;

        setSending(true);
        setInputText('');

        // Optimistic update
        const tempMsg: Message = {
            body,
            senderId: currentUserId,
            createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, tempMsg]);

        try {
            await post(`/api/messages/${conversation.id}`, { body });
            // Fetch the actual messages
            const res = await get<{ conversation: Conversation }>(`/api/messages/${conversation.id}`);
            if (res.ok) {
                setMessages(res.data.conversation.messages || []);
            }
        } catch {
            // Revert on error
            setMessages((prev) => prev.filter((m) => m !== tempMsg));
            setInputText(body);
        } finally {
            setSending(false);
        }
    };

    const getOtherUser = () => {
        if (!conversation) return null;
        return conversation.buyerId === currentUserId ? conversation.seller : conversation.buyer;
    };

    const formatTime = (iso: string) => {
        return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (iso: string) => {
        const date = new Date(iso);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Heute';
        if (diffDays === 1) return 'Gestern';
        return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
    };

    const formatPrice = (cents: number) =>
        new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);

    const shouldShowDateHeader = (msg: Message, index: number) => {
        if (index === 0) return true;
        const prevDate = new Date(messages[index - 1].createdAt).toDateString();
        const currDate = new Date(msg.createdAt).toDateString();
        return prevDate !== currDate;
    };

    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
        const isOwn = item.senderId === currentUserId;
        const showDate = shouldShowDateHeader(item, index);

        return (
            <View>
                {showDate && (
                    <View style={styles.dateHeader}>
                        <Text style={styles.dateHeaderText}>{formatDate(item.createdAt)}</Text>
                    </View>
                )}
                <View style={[styles.bubbleRow, isOwn && styles.bubbleRowOwn]}>
                    <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                        <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>
                            {item.body}
                        </Text>
                        <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>
                            {formatTime(item.createdAt)}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    const otherUser = getOtherUser();

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
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.white} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.headerInfo}
                    onPress={() => otherUser && navigation.navigate('PublicProfile', { id: otherUser.id })}
                >
                    <View style={styles.headerAvatar}>
                        <Text style={styles.headerAvatarText}>
                            {(otherUser?.firstName?.[0] ?? '?').toUpperCase()}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.headerName}>
                            {otherUser?.firstName} {otherUser?.lastName?.[0]}.
                        </Text>
                        {otherUser?.idVerified && (
                            <View style={styles.verifiedRow}>
                                <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                                <Text style={styles.verifiedText}>Verifiziert</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </View>

            {/* Security Banner */}
            <View style={styles.securityBanner}>
                <Ionicons name="shield-checkmark" size={14} color={colors.success} />
                <Text style={styles.securityText}>
                    Wickle Zahlungen immer über den Ehren-Deal Treuhand-Service ab
                </Text>
            </View>

            {/* Listing Context */}
            {conversation?.listing && (
                <TouchableOpacity
                    style={styles.listingBar}
                    onPress={() => navigation.navigate('ListingDetail', { id: conversation.listing.id })}
                    activeOpacity={0.7}
                >
                    {conversation.listing.images?.[0] && (
                        <Image source={{ uri: conversation.listing.images[0].url }} style={styles.listingImage} />
                    )}
                    <View style={styles.listingInfo}>
                        <Text style={styles.listingTitle} numberOfLines={1}>{conversation.listing.title}</Text>
                        <Text style={styles.listingPrice}>{formatPrice(conversation.listing.price)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
            )}

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                {/* Messages */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item, index) => item.id ?? `msg-${index}`}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.messageList}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    ListEmptyComponent={
                        <View style={styles.emptyChat}>
                            <Ionicons name="chatbubble-ellipses-outline" size={40} color={colors.textMuted} />
                            <Text style={styles.emptyChatText}>Starte die Unterhaltung</Text>
                        </View>
                    }
                />

                {/* Input Bar */}
                <View style={styles.inputBar}>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Nachricht schreiben..."
                        placeholderTextColor={colors.textMuted}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={2000}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
                        onPress={handleSend}
                        disabled={!inputText.trim() || sending}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                            <Ionicons name="send" size={20} color={colors.white} />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.navy,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        gap: spacing.sm,
    },
    headerBtn: { padding: spacing.xs },
    headerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.sm },
    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerAvatarText: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.white },
    headerName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.white },
    verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    verifiedText: { fontSize: fontSize.xs, color: colors.success },
    securityBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.successLight,
        paddingVertical: spacing.xs,
        gap: spacing.xs,
    },
    securityText: { fontSize: 11, color: colors.success },
    listingBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: spacing.sm,
    },
    listingImage: { width: 40, height: 40, borderRadius: borderRadius.sm },
    listingInfo: { flex: 1 },
    listingTitle: { fontSize: fontSize.sm, color: colors.text },
    listingPrice: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.navy },
    messageList: {
        padding: spacing.md,
        paddingBottom: spacing.sm,
        flexGrow: 1,
        justifyContent: 'flex-end',
    },
    dateHeader: {
        alignItems: 'center',
        marginVertical: spacing.md,
    },
    dateHeaderText: {
        fontSize: fontSize.xs,
        color: colors.textMuted,
        backgroundColor: colors.borderLight,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        overflow: 'hidden',
    },
    bubbleRow: {
        flexDirection: 'row',
        marginBottom: spacing.xs,
    },
    bubbleRowOwn: {
        justifyContent: 'flex-end',
    },
    bubble: {
        maxWidth: '78%',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
    },
    bubbleOwn: {
        backgroundColor: colors.primary,
        borderBottomRightRadius: borderRadius.sm,
    },
    bubbleOther: {
        backgroundColor: colors.surface,
        borderBottomLeftRadius: borderRadius.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    bubbleText: {
        fontSize: fontSize.base,
        color: colors.text,
        lineHeight: 20,
    },
    bubbleTextOwn: { color: colors.white },
    bubbleTime: {
        fontSize: 10,
        color: colors.textMuted,
        alignSelf: 'flex-end',
        marginTop: 3,
    },
    bubbleTimeOwn: { color: 'rgba(255,255,255,0.7)' },
    emptyChat: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
        gap: spacing.sm,
    },
    emptyChatText: { fontSize: fontSize.base, color: colors.textMuted },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: spacing.sm,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: spacing.sm,
    },
    textInput: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: fontSize.base,
        color: colors.text,
        maxHeight: 100,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sendButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: { opacity: 0.5 },
});
