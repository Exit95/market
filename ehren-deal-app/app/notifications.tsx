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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MessageSquare,
  ShoppingBag,
  Star,
  Bell,
  AlertTriangle,
  Package,
} from 'lucide-react-native';
import { notificationService } from '@/services';
import { LoadingState, EmptyState } from '@/components/layout';
import { colors, spacing } from '@/theme';
import { formatRelativeDate } from '@/utils/format';
import type { Notification, NotificationType } from '@/types';

const ICONS: Record<NotificationType, React.ReactNode> = {
  MESSAGE: <MessageSquare size={20} color={colors.primary[500]} />,
  DEAL_UPDATE: <ShoppingBag size={20} color={colors.success[500]} />,
  REVIEW: <Star size={20} color={colors.warning[500]} />,
  LISTING_UPDATE: <Package size={20} color={colors.primary[500]} />,
  SYSTEM: <Bell size={20} color={colors.neutral[500]} />,
  MODERATION: <AlertTriangle size={20} color={colors.error[500]} />,
};

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: notifications,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications(),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handlePress = useCallback(
    (notification: Notification) => {
      if (!notification.readAt) {
        markReadMutation.mutate(notification.id);
      }

      // Navigate based on notification data
      const data = notification.data;
      if (data?.dealId) {
        router.push(`/deal/${data.dealId}`);
      } else if (data?.conversationId) {
        router.push(`/chat/${data.conversationId}`);
      } else if (data?.listingId) {
        router.push(`/listing/${data.listingId}`);
      }
    },
    [router, markReadMutation]
  );

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => (
      <Pressable
        onPress={() => handlePress(item)}
        style={({ pressed }) => [
          styles.notifRow,
          !item.readAt && styles.notifUnread,
          pressed && { backgroundColor: colors.neutral[50] },
        ]}
      >
        <View style={styles.notifIcon}>
          {ICONS[item.type] ?? ICONS.SYSTEM}
        </View>
        <View style={styles.notifContent}>
          <Text style={styles.notifTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.notifBody} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.notifTime}>
            {formatRelativeDate(item.createdAt)}
          </Text>
        </View>
        {!item.readAt && <View style={styles.unreadDot} />}
      </Pressable>
    ),
    [handlePress]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <ArrowLeft size={22} color={colors.neutral[900]} />
        </Pressable>
        <Text style={styles.headerTitle}>Benachrichtigungen</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <LoadingState message="Lade Benachrichtigungen..." />
      ) : !notifications || notifications.length === 0 ? (
        <EmptyState
          icon={<Bell size={48} color={colors.neutral[300]} strokeWidth={1.5} />}
          title="Keine Benachrichtigungen"
          description="Du hast aktuell keine neuen Benachrichtigungen."
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary[500]}
            />
          }
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', height: 52,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.background,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1, fontSize: 17, fontWeight: '600',
    color: colors.neutral[900], textAlign: 'center',
  },
  list: { paddingBottom: 24 },
  notifRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 14, paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[100],
  },
  notifUnread: { backgroundColor: colors.primary[50] },
  notifIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.neutral[100],
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  notifContent: { flex: 1 },
  notifTitle: {
    fontSize: 15, fontWeight: '600', color: colors.neutral[900],
    marginBottom: 2,
  },
  notifBody: {
    fontSize: 14, color: colors.neutral[600],
    lineHeight: 20, marginBottom: 4,
  },
  notifTime: { fontSize: 12, color: colors.neutral[400] },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.primary[500],
    marginTop: 6, marginLeft: 8,
  },
});
