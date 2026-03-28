import React, { useState } from 'react';
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
import { ArrowLeft, Star, CheckCircle } from 'lucide-react-native';
import { dealService, reviewService } from '@/services';
import { useAuthStore } from '@/store/auth-store';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Avatar from '@/components/ui/Avatar';
import { LoadingState, ErrorState } from '@/components/layout';
import { colors, spacing } from '@/theme';

export default function CreateReviewScreen() {
  const { dealId } = useLocalSearchParams<{ dealId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: deal, isLoading, isError } = useQuery({
    queryKey: ['deal', dealId],
    queryFn: () => dealService.getDeal(dealId!),
    enabled: !!dealId,
  });

  const mutation = useMutation({
    mutationFn: () =>
      reviewService.createReview({
        dealId: dealId!,
        rating,
        text: text.trim() || undefined,
      }),
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['deal', dealId] });
      queryClient.invalidateQueries({ queryKey: ['user-reviews'] });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error ?? 'Bewertung konnte nicht gespeichert werden.';
      Alert.alert('Fehler', msg);
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingState message="Lade Deal..." />
      </SafeAreaView>
    );
  }

  if (isError || !deal) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState message="Deal nicht gefunden." onRetry={() => router.back()} />
      </SafeAreaView>
    );
  }

  if (deal.status !== 'COMPLETED') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.neutral[900]} />
          </Pressable>
          <Text style={styles.headerTitle}>Bewertung</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centeredMsg}>
          <Text style={styles.centeredMsgText}>
            Bewertungen koennen nur fuer abgeschlossene Deals abgegeben werden.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isBuyer = deal.buyerId === profile?.id;
  const otherParty = isBuyer ? deal.seller : deal.buyer;

  // Check if already reviewed
  const alreadyReviewed = deal.reviews?.some(
    (r: any) => r.reviewerId === profile?.id
  );

  if (submitted || alreadyReviewed) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <CheckCircle size={56} color={colors.success[500]} strokeWidth={1.5} />
          <Text style={styles.successTitle}>
            {alreadyReviewed && !submitted ? 'Bereits bewertet' : 'Bewertung gespeichert'}
          </Text>
          <Text style={styles.successDesc}>
            {alreadyReviewed && !submitted
              ? 'Du hast diesen Deal bereits bewertet.'
              : 'Vielen Dank fuer deine Bewertung! Sie wird nach der Blind-Review-Phase sichtbar.'}
          </Text>
          <Button variant="primary" onPress={() => router.back()} style={{ marginTop: 24 }}>
            Zurueck
          </Button>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>Bewertung abgeben</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Other Party */}
        <View style={styles.partySection}>
          <Avatar
            uri={otherParty?.avatarUrl}
            name={otherParty?.displayName ?? '?'}
            size="lg"
          />
          <Text style={styles.partyName}>{otherParty?.displayName}</Text>
          <Text style={styles.partyRole}>
            {isBuyer ? 'Verkaeufer' : 'Kaeufer'}
          </Text>
        </View>

        {/* Deal Info */}
        <View style={styles.dealInfoCard}>
          <Text style={styles.dealInfoTitle}>{deal.listing?.title}</Text>
          <Text style={styles.dealInfoPrice}>
            {deal.agreedPrice ? `${(deal.agreedPrice / 100).toFixed(2)} EUR` : ''}
          </Text>
        </View>

        {/* Star Rating */}
        <Text style={styles.ratingLabel}>Wie war deine Erfahrung?</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable
              key={star}
              onPress={() => setRating(star)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Star
                size={40}
                color={star <= rating ? colors.warning[500] : colors.neutral[300]}
                fill={star <= rating ? colors.warning[500] : 'transparent'}
              />
            </Pressable>
          ))}
        </View>
        {rating > 0 && (
          <Text style={styles.ratingHint}>
            {rating === 1 && 'Schlecht'}
            {rating === 2 && 'Nicht gut'}
            {rating === 3 && 'In Ordnung'}
            {rating === 4 && 'Gut'}
            {rating === 5 && 'Ausgezeichnet'}
          </Text>
        )}

        {/* Review Text */}
        <Input
          label="Kommentar (optional)"
          placeholder="Beschreibe deine Erfahrung..."
          multiline
          onChangeText={setText}
          value={text}
          maxLength={500}
          style={styles.textField}
        />
        <Text style={styles.charCount}>{text.length}/500</Text>

        {/* Submit */}
        <Button
          variant="primary"
          fullWidth
          loading={mutation.isPending}
          disabled={rating === 0}
          onPress={() => mutation.mutate()}
          style={{ marginTop: 16 }}
        >
          Bewertung abgeben
        </Button>

        <Text style={styles.blindNote}>
          Bewertungen werden erst nach 14 Tagen sichtbar (Blind-Review-Prinzip),
          damit beide Parteien unabhaengig voneinander bewerten koennen.
        </Text>
      </ScrollView>
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
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1, fontSize: 17, fontWeight: '600',
    color: colors.neutral[900], textAlign: 'center',
  },
  scroll: { padding: spacing.md, paddingBottom: 40 },
  partySection: { alignItems: 'center', marginBottom: 20 },
  partyName: {
    fontSize: 18, fontWeight: '700', color: colors.neutral[900], marginTop: 10,
  },
  partyRole: { fontSize: 14, color: colors.neutral[500], marginTop: 2 },
  dealInfoCard: {
    backgroundColor: colors.surface, borderRadius: 12,
    padding: 14, marginBottom: 24,
    shadowColor: colors.black, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  dealInfoTitle: { fontSize: 15, fontWeight: '600', color: colors.neutral[900] },
  dealInfoPrice: { fontSize: 14, fontWeight: '700', color: colors.primary[600], marginTop: 4 },
  ratingLabel: {
    fontSize: 16, fontWeight: '600', color: colors.neutral[900],
    textAlign: 'center', marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8,
  },
  ratingHint: {
    fontSize: 14, color: colors.warning[600],
    textAlign: 'center', fontWeight: '500', marginBottom: 20,
  },
  textField: { marginBottom: 4 },
  charCount: {
    fontSize: 12, color: colors.neutral[400], textAlign: 'right', marginBottom: 8,
  },
  blindNote: {
    fontSize: 13, color: colors.neutral[400],
    textAlign: 'center', lineHeight: 18, marginTop: 16,
  },
  successContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
  },
  successTitle: {
    fontSize: 22, fontWeight: '700', color: colors.neutral[900],
    marginTop: 20, marginBottom: 8,
  },
  successDesc: {
    fontSize: 15, color: colors.neutral[500],
    textAlign: 'center', lineHeight: 22,
  },
  centeredMsg: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
  },
  centeredMsgText: {
    fontSize: 15, color: colors.neutral[500], textAlign: 'center', lineHeight: 22,
  },
});
