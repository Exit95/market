import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, ChevronDown, ChevronUp } from 'lucide-react-native';
import { conversationService, dealService } from '@/services';
import { useAuthStore } from '@/store/auth-store';
import { useWebSocket } from '@/hooks/use-websocket';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import ChatBubble from '@/components/chat/ChatBubble';
import { LoadingState, ErrorState } from '@/components/layout';
import { colors, spacing } from '@/theme';
import { formatPrice } from '@/utils/format';
import type {
  ConversationWithDetails,
  Message,
  DealWithDetails,
} from '@/types';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [text, setText] = useState('');
  const [contextExpanded, setContextExpanded] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { on, sendTyping } = useWebSocket();

  // Fetch conversation details
  const {
    data: conversations,
    isLoading: convLoading,
  } = useQuery<ConversationWithDetails[]>({
    queryKey: ['conversations'],
    queryFn: conversationService.getConversations,
  });

  const conversation = conversations?.find((c) => c.id === id);

  // Fetch messages
  const {
    data: messages,
    isLoading: msgsLoading,
    isError,
    refetch,
  } = useQuery<Message[]>({
    queryKey: ['messages', id],
    queryFn: () => conversationService.getMessages(id!),
    enabled: !!id,
    refetchInterval: 10000, // Fallback Polling, WebSocket uebernimmt Echtzeit
  });

  // WebSocket: Typing-Indikator empfangen
  React.useEffect(() => {
    const unsubscribe = on('typing', (data: any) => {
      if (data.conversationId === id) {
        setIsTyping(true);
        const timer = setTimeout(() => setIsTyping(false), 3000);
        return () => clearTimeout(timer);
      }
    });
    return unsubscribe;
  }, [on, id]);

  // Fetch deals for this listing
  const { data: deals } = useQuery<DealWithDetails[]>({
    queryKey: ['deals'],
    queryFn: dealService.getDeals,
  });

  const existingDeal = deals?.find(
    (d) => d.listingId === conversation?.listingId
  );

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      conversationService.sendMessage(id!, body, 'text'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setText('');
    },
  });

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  }, [text, sendMutation]);

  const handleDealAction = useCallback(() => {
    if (existingDeal) {
      router.push(`/deal/${existingDeal.id}`);
    } else if (conversation) {
      // Create a new deal for this listing
      dealService
        .createDeal(conversation.listingId)
        .then((deal) => {
          queryClient.invalidateQueries({ queryKey: ['deals'] });
          router.push(`/deal/${deal.id}`);
        })
        .catch(() => {});
    }
  }, [existingDeal, conversation, router, queryClient]);

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => (
      <ChatBubble
        message={item}
        isOwn={item.senderId === user?.id}
      />
    ),
    [user?.id]
  );

  if (convLoading || msgsLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingState message="Chat wird geladen..." />
      </SafeAreaView>
    );
  }

  if (isError || !conversation) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState
          message="Chat konnte nicht geladen werden."
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  const otherUser = conversation.otherUser;
  const listing = conversation.listing;
  const sortedMessages = messages
    ? [...messages].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Zurueck"
          >
            <ArrowLeft size={22} color={colors.neutral[900]} />
          </Pressable>

          <Pressable
            onPress={() => router.push(`/user/${otherUser.userId}`)}
            style={styles.headerCenter}
            accessibilityRole="button"
          >
            <Avatar
              uri={otherUser.avatarUrl}
              size="sm"
              name={otherUser.displayName}
            />
            <Text style={styles.headerName} numberOfLines={1}>
              {otherUser.displayName}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setContextExpanded((v) => !v)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.expandBtn}
            accessibilityRole="button"
            accessibilityLabel="Inserat-Details"
          >
            {contextExpanded ? (
              <ChevronUp size={20} color={colors.neutral[500]} />
            ) : (
              <ChevronDown size={20} color={colors.neutral[500]} />
            )}
          </Pressable>
        </View>

        {/* Listing Context Card */}
        {contextExpanded && (
          <Pressable
            onPress={() => router.push(`/listing/${listing.id}`)}
            style={({ pressed }) => [
              styles.listingCard,
              pressed && { opacity: 0.8 },
            ]}
            accessibilityRole="button"
          >
            {listing.images?.[0]?.url ? (
              <Image source={{ uri: listing.images[0].url }} style={styles.listingImage} />
            ) : (
              <View style={styles.listingImagePlaceholder}>
                <Text style={styles.listingImageText}>{listing.title.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.listingInfo}>
              <Text style={styles.listingTitle} numberOfLines={1}>
                {listing.title}
              </Text>
              <Text style={styles.listingPrice}>
                {formatPrice(listing.price)}
              </Text>
            </View>
            <View>
              <Button
                size="sm"
                variant={existingDeal ? 'secondary' : 'primary'}
                onPress={handleDealAction}
              >
                {existingDeal ? 'Deal ansehen' : 'Deal vorschlagen'}
              </Button>
            </View>
          </Pressable>
        )}

        {/* Message List */}
        <FlatList
          data={sortedMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        {/* Typing Indicator */}
        {isTyping && (
          <View style={styles.typingRow}>
            <Text style={styles.typingText}>{otherUser.displayName} tippt...</Text>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            placeholder="Nachricht schreiben..."
            placeholderTextColor={colors.neutral[400]}
            value={text}
            onChangeText={(val) => {
              setText(val);
              if (conversation && val.length > 0) {
                const recipientId = conversation.buyerId === user?.id
                  ? conversation.sellerId : conversation.buyerId;
                sendTyping(id!, recipientId);
              }
            }}
            multiline
            maxLength={2000}
            returnKeyType="default"
            blurOnSubmit={false}
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || sendMutation.isPending}
            style={({ pressed }) => [
              styles.sendBtn,
              (!text.trim() || sendMutation.isPending) && styles.sendBtnDisabled,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Senden"
          >
            <Send size={20} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.surface,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
    gap: 8,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
    flex: 1,
  },
  expandBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[200],
    gap: 10,
  },
  listingImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingImageText: {
    fontSize: 10,
    color: colors.neutral[400],
  },
  listingInfo: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[900],
  },
  listingPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary[600],
    marginTop: 2,
  },
  messageList: {
    paddingVertical: 12,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.neutral[200],
    gap: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: colors.neutral[100],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.neutral[900],
    lineHeight: 20,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.neutral[300],
  },
  listingImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  typingRow: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  typingText: {
    fontSize: 12,
    color: colors.neutral[400],
    fontStyle: 'italic',
  },
});
