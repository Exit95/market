import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle } from 'lucide-react-native';
import { conversationService } from '@/services';
import { useAuthStore } from '@/store/auth-store';
import Avatar from '@/components/ui/Avatar';
import { EmptyState, LoadingState, ErrorState } from '@/components/layout';
import { colors, spacing } from '@/theme';
import { formatRelativeDate, truncate } from '@/utils/format';
import type { ConversationWithDetails } from '@/types';

export default function MessagesScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const {
    data: conversations,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<ConversationWithDetails[]>({
    queryKey: ['conversations'],
    queryFn: conversationService.getConversations,
  });

  const sorted = React.useMemo(() => {
    if (!conversations) return [];
    return [...conversations].sort((a, b) => {
      const dateA = a.lastMessageAt || a.createdAt;
      const dateB = b.lastMessageAt || b.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [conversations]);

  const handlePress = useCallback(
    (id: string) => {
      router.push(`/chat/${id}`);
    },
    [router]
  );

  const handleBrowse = useCallback(() => {
    router.push('/(tabs)/search');
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: ConversationWithDetails }) => {
      const otherUser = item.otherUser;
      const lastMsg = item.lastMessage;
      const isUnread =
        lastMsg && !lastMsg.readAt && lastMsg.senderId !== user?.id;
      const timestamp = lastMsg?.createdAt || item.createdAt;

      return (
        <Pressable
          onPress={() => handlePress(item.id)}
          style={({ pressed }) => [
            styles.row,
            pressed && styles.rowPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Chat mit ${otherUser.displayName}`}
        >
          <View style={styles.avatarWrapper}>
            <Avatar
              uri={otherUser.avatarUrl}
              size="md"
              name={otherUser.displayName}
            />
            {isUnread && <View style={styles.unreadDot} />}
          </View>

          <View style={styles.content}>
            <View style={styles.topRow}>
              <Text
                style={[styles.name, isUnread && styles.nameUnread]}
                numberOfLines={1}
              >
                {otherUser.displayName}
              </Text>
              <Text style={styles.timestamp}>
                {formatRelativeDate(timestamp)}
              </Text>
            </View>

            <Text style={styles.listingTitle} numberOfLines={1}>
              {item.listing.title}
            </Text>

            {lastMsg && (
              <Text
                style={[
                  styles.preview,
                  isUnread && styles.previewUnread,
                ]}
                numberOfLines={1}
              >
                {lastMsg.senderId === user?.id ? 'Du: ' : ''}
                {truncate(lastMsg.body, 60)}
              </Text>
            )}
          </View>
        </Pressable>
      );
    },
    [user?.id, handlePress]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Nachrichten</Text>
        </View>
        <LoadingState message="Nachrichten werden geladen..." />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Nachrichten</Text>
        </View>
        <ErrorState
          message="Nachrichten konnten nicht geladen werden."
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nachrichten</Text>
      </View>

      {sorted.length === 0 ? (
        <EmptyState
          icon={
            <MessageCircle
              size={48}
              color={colors.neutral[300]}
              strokeWidth={1.5}
            />
          }
          title="Noch keine Nachrichten"
          description="Starte eine Unterhaltung, indem du auf ein Inserat antwortest."
          actionLabel="Inserate durchstoebern"
          onAction={handleBrowse}
        />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary[500]}
              colors={[colors.primary[500]]}
            />
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  list: {
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    backgroundColor: colors.surface,
  },
  rowPressed: {
    backgroundColor: colors.neutral[50],
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary[500],
    borderWidth: 2,
    borderColor: colors.surface,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.neutral[900],
    flex: 1,
    marginRight: 8,
  },
  nameUnread: {
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 12,
    color: colors.neutral[400],
  },
  listingTitle: {
    fontSize: 12,
    color: colors.primary[500],
    marginBottom: 2,
  },
  preview: {
    fontSize: 14,
    color: colors.neutral[500],
    lineHeight: 19,
  },
  previewUnread: {
    color: colors.neutral[800],
    fontWeight: '500',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.neutral[200],
    marginLeft: 76,
  },
});
