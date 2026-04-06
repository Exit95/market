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
import { useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, CheckCircle } from 'lucide-react-native';
import { reportService } from '@/services';
import { reportSchema, type ReportFormData } from '@/validation/report';
import { REPORT_REASONS } from '@/utils/constants';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import Input from '@/components/ui/Input';
import { colors, spacing } from '@/theme';

export default function ReportScreen() {
  const { targetType, targetId } = useLocalSearchParams<{
    targetType: string;
    targetId: string;
  }>();
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reason: undefined as any,
      description: '',
    },
  });

  const selectedReason = watch('reason');

  const mutation = useMutation({
    mutationFn: (data: ReportFormData) =>
      reportService.createReport(
        targetType || 'USER',
        targetId || '',
        data.reason,
        data.description || undefined
      ),
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: () => {
      Alert.alert(
        'Fehler',
        'Die Meldung konnte nicht gesendet werden. Bitte versuche es erneut.'
      );
    },
  });

  const onSubmit = (data: ReportFormData) => {
    mutation.mutate(data);
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <CheckCircle
            size={56}
            color={colors.success[500]}
            strokeWidth={1.5}
          />
          <Text style={styles.successTitle}>Meldung gesendet</Text>
          <Text style={styles.successDesc}>
            Vielen Dank fuer deine Meldung. Unser Team wird den Fall pruefen.
          </Text>
          <Button
            variant="primary"
            onPress={() => router.back()}
            style={{ marginTop: 24 }}
          >
            Schliessen
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => [
            styles.closeBtn,
            pressed && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Schliessen"
        >
          <X size={22} color={colors.neutral[900]} />
        </Pressable>
        <Text style={styles.headerTitle}>Melden</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.questionTitle}>
          Was moechtest du melden?
        </Text>
        <Text style={styles.questionSub}>
          Waehle einen Grund fuer deine Meldung.
        </Text>

        {/* Reason Chips */}
        <Controller
          control={control}
          name="reason"
          render={({ field: { onChange, value } }) => (
            <View style={styles.chipsGrid}>
              {REPORT_REASONS.map((reason) => (
                <Chip
                  key={reason.value}
                  label={reason.label}
                  selected={value === reason.value}
                  onPress={() => onChange(reason.value)}
                />
              ))}
            </View>
          )}
        />
        {errors.reason && (
          <Text style={styles.errorText}>
            Bitte waehle einen Grund aus.
          </Text>
        )}

        {/* Description */}
        <View style={styles.descSection}>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Beschreibung (optional)"
                placeholder="Beschreibe den Vorfall genauer..."
                multiline
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors.description?.message}
              />
            )}
          />
        </View>

        {/* Submit */}
        <Button
          variant="primary"
          fullWidth
          loading={mutation.isPending}
          disabled={!selectedReason}
          onPress={handleSubmit(onSubmit)}
          style={{ marginTop: 8 }}
        >
          Meldung absenden
        </Button>
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
  closeBtn: {
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
    paddingBottom: 40,
  },
  questionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 6,
  },
  questionSub: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 20,
    lineHeight: 20,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: colors.error[500],
    marginTop: 4,
    marginBottom: 8,
  },
  descSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral[900],
    marginTop: 20,
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 15,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 22,
  },
});
