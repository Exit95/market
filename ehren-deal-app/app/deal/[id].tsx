import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MessageSquare, Star } from 'lucide-react-native';
import { dealService } from '@/services';
import { useAuthStore } from '@/store/auth-store';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import DealTimeline from '@/components/deal/DealTimeline';
import DealProgressBar from '@/components/deal/DealProgressBar';
import { LoadingState, ErrorState } from '@/components/layout';
import { colors, spacing } from '@/theme';
import { formatPrice } from '@/utils/format';
import { DEAL_STATUS_LABELS } from '@/utils/constants';
import type { DealWithDetails, DealStatus } from '@/types';

interface NextStepConfig {
  instruction: string;
  actionLabel: string;
  nextStatus: DealStatus;
}

function getNextStep(
  status: DealStatus,
  isSeller: boolean
): NextStepConfig | null {
  if (status === 'INQUIRY' && isSeller) {
    return {
      instruction: 'Ein Kaeufer hat dir ein Angebot gesendet. Bitte pruefe und akzeptiere es.',
      actionLabel: 'Angebot annehmen',
      nextStatus: 'AGREED',
    };
  }
  if (status === 'AGREED') {
    return {
      instruction: isSeller
        ? 'Der Deal wurde angenommen. Bereite den Artikel fuer die Uebergabe vor.'
        : 'Der Verkaeufer hat dein Angebot angenommen. Warte auf die Uebergabe.',
      actionLabel: isSeller ? 'Als bezahlt markieren' : '',
      nextStatus: 'PAID',
    };
  }
  if (status === 'PAID' && isSeller) {
    return {
      instruction: 'Markiere den Artikel als uebergeben oder versendet.',
      actionLabel: 'Als uebergeben markieren',
      nextStatus: 'HANDED_OVER',
    };
  }
  if (status === 'HANDED_OVER' && !isSeller) {
    return {
      instruction: 'Hast du den Artikel erhalten? Bestaetige den Empfang.',
      actionLabel: 'Als erhalten bestaetigen',
      nextStatus: 'COMPLETED',
    };
  }
  if (status === 'SHIPPED' && !isSeller) {
    return {
      instruction: 'Der Artikel wurde versendet. Bestaetige den Empfang, sobald du ihn erhalten hast.',
      actionLabel: 'Als erhalten bestaetigen',
      nextStatus: 'HANDED_OVER',
    };
  }
  return null;
}

export default function DealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [cancelling, setCancelling] = useState(false);

  const {
    data: deal,
    isLoading,
    isError,
    refetch,
  } = useQuery<DealWithDetails>({
    queryKey: ['deal', id],
    queryFn: () => dealService.getDeal(id!),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: ({
      status,
      note,
    }: {
      status: string;
      note?: string;
    }) => dealService.updateDealStatus(id!, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal', id] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => dealService.cancelDeal(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal', id] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      setCancelling(false);
    },
  });

  const handleStatusUpdate = useCallback(
    (nextStatus: DealStatus) => {
      const label =
        DEAL_STATUS_LABELS[nextStatus] || nextStatus;
      Alert.alert(
        'Status aendern',
        `Moechtest du den Status auf "${label}" setzen?`,
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Bestaetigen',
            onPress: () =>
              statusMutation.mutate({ status: nextStatus }),
          },
        ]
      );
    },
    [statusMutation]
  );

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Deal stornieren',
      'Moechtest du diesen Deal wirklich stornieren?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Stornieren',
          style: 'destructive',
          onPress: () =>
            cancelMutation.mutate('Vom Nutzer storniert'),
        },
      ]
    );
  }, [cancelMutation]);

  const handleOpenChat = useCallback(() => {
    // Navigate to conversation for this deal's listing
    router.back();
  }, [router]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingState message="Deal wird geladen..." />
      </SafeAreaView>
    );
  }

  if (isError || !deal) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.neutral[900]} />
          </Pressable>
        </View>
        <ErrorState
          message="Deal konnte nicht geladen werden."
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  const profile = useAuthStore((s) => s.profile);
  const isSeller = deal.sellerId === profile?.id;
  const nextStep = getNextStep(deal.status, isSeller);
  const isTerminal =
    deal.status === 'COMPLETED' ||
    deal.status === 'CANCELED' ||
    deal.status === 'CONFLICT';
  const canReview =
    deal.status === 'COMPLETED' &&
    !deal.reviews?.some((r: any) => r.reviewerId === profile?.id);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
        >
          <ArrowLeft size={22} color={colors.neutral[900]} />
        </Pressable>
        <Text style={styles.headerTitle}>Deal-Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Listing Mini-Card */}
        <Card style={styles.listingCard}>
          <View style={styles.listingRow}>
            <View style={styles.listingImgPlaceholder}>
              <Text style={styles.listingImgText}>
                {deal.listing.title.charAt(0)}
              </Text>
            </View>
            <View style={styles.listingMeta}>
              <Text style={styles.listingTitle} numberOfLines={1}>
                {deal.listing.title}
              </Text>
              <Text style={styles.agreedPrice}>
                Vereinbart: {formatPrice(deal.agreedPrice)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Progress Bar */}
        <Card style={styles.progressCard}>
          <Text style={styles.cardLabel}>Fortschritt</Text>
          <DealProgressBar
            currentStatus={deal.status}
            dealType={deal.dealType}
          />
        </Card>

        {/* Next Step Action Card */}
        {nextStep && nextStep.actionLabel && (
          <Card style={styles.nextStepCard}>
            <Text style={styles.nextStepTitle}>Naechster Schritt</Text>
            <Text style={styles.nextStepInstruction}>
              {nextStep.instruction}
            </Text>
            <Button
              variant="primary"
              fullWidth
              loading={statusMutation.isPending}
              onPress={() => handleStatusUpdate(nextStep.nextStatus)}
              style={{ marginTop: 12 }}
            >
              {nextStep.actionLabel}
            </Button>
          </Card>
        )}

        {/* Context Buttons */}
        <View style={styles.contextRow}>
          <Button
            variant="secondary"
            onPress={handleOpenChat}
            style={styles.contextBtn}
          >
            <View style={styles.contextBtnInner}>
              <MessageSquare size={16} color={colors.primary[500]} />
              <Text style={styles.contextBtnText}>Chat oeffnen</Text>
            </View>
          </Button>
        </View>

        {/* Status Timeline */}
        <Card style={styles.timelineCard}>
          <Text style={styles.cardLabel}>Verlauf</Text>
          <DealTimeline
            statusHistory={deal.statusHistory}
            currentStatus={deal.status}
            dealType={deal.dealType}
          />
        </Card>

        {/* Review Button */}
        {canReview && (
          <Card style={styles.reviewCard}>
            <Text style={styles.nextStepTitle}>Deal bewerten</Text>
            <Text style={styles.nextStepInstruction}>
              Wie war deine Erfahrung? Bewerte diesen Deal, um anderen Nutzern zu helfen.
            </Text>
            <Button
              variant="primary"
              fullWidth
              onPress={() => router.push({ pathname: '/create-review', params: { dealId: id } })}
              style={{ marginTop: 12 }}
            >
              <View style={styles.contextBtnInner}>
                <Star size={16} color={colors.white} />
                <Text style={{ color: colors.white, fontSize: 15, fontWeight: '600' }}>Bewertung abgeben</Text>
              </View>
            </Button>
          </Card>
        )}

        {/* Cancel Option */}
        {!isTerminal && (
          <Pressable
            onPress={handleCancel}
            disabled={cancelMutation.isPending}
            style={({ pressed }) => [
              styles.cancelLink,
              pressed && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.cancelText}>Deal stornieren</Text>
          </Pressable>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.background,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: colors.neutral[900],
    textAlign: 'center',
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: 24,
  },
  listingCard: {
    marginBottom: 12,
  },
  listingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listingImgPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listingImgText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[400],
  },
  listingMeta: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  agreedPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary[600],
    marginTop: 4,
  },
  progressCard: {
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  nextStepCard: {
    marginBottom: 12,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  nextStepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary[700],
    marginBottom: 6,
  },
  nextStepInstruction: {
    fontSize: 14,
    color: colors.primary[800],
    lineHeight: 20,
  },
  contextRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  contextBtn: {
    flex: 1,
  },
  contextBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contextBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[500],
  },
  timelineCard: {
    marginBottom: 16,
  },
  reviewCard: {
    marginBottom: 12,
    backgroundColor: colors.success[50],
    borderWidth: 1,
    borderColor: colors.success[100],
  },
  cancelLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 14,
    color: colors.error[500],
    fontWeight: '500',
  },
});
