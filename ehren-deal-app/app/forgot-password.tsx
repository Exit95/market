import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, Mail } from 'lucide-react-native';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { colors, spacing } from '@/theme';

const forgotPasswordSchema = z.object({
  email: z.string().email('Bitte gib eine gueltige E-Mail ein'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const email = watch('email');

  const mutation = useMutation({
    mutationFn: async (data: ForgotPasswordForm) => {
      await api.post('/auth/forgot-password', { email: data.email });
    },
    onSuccess: () => setSubmitted(true),
    onError: () => {
      // Aus Sicherheitsgruenden immer Erfolg zeigen
      setSubmitted(true);
    },
  });

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <CheckCircle size={56} color={colors.success[500]} strokeWidth={1.5} />
          <Text style={styles.successTitle}>E-Mail gesendet</Text>
          <Text style={styles.successDesc}>
            Falls ein Konto mit dieser E-Mail existiert, haben wir dir einen Link
            zum Zuruecksetzen deines Passworts gesendet.
          </Text>
          <Button variant="primary" onPress={() => router.back()} style={{ marginTop: 24 }}>
            Zurueck zum Login
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
        <Text style={styles.headerTitle}>Passwort vergessen</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Mail size={32} color={colors.primary[500]} />
            </View>
          </View>

          <Text style={styles.title}>Passwort zuruecksetzen</Text>
          <Text style={styles.subtitle}>
            Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum
            Zuruecksetzen deines Passworts.
          </Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="E-Mail"
                placeholder="deine@email.de"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors.email?.message}
                style={styles.field}
              />
            )}
          />

          <Button
            variant="primary"
            fullWidth
            loading={mutation.isPending}
            disabled={!email}
            onPress={handleSubmit((data) => mutation.mutate(data))}
          >
            Link senden
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
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
  scroll: { padding: spacing.md, paddingBottom: 40 },
  iconContainer: { alignItems: 'center', marginBottom: 20, marginTop: 20 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary[50],
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontSize: 22, fontWeight: '700', color: colors.neutral[900],
    textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontSize: 15, color: colors.neutral[500],
    textAlign: 'center', lineHeight: 22, marginBottom: 28,
  },
  field: { marginBottom: 20 },
  successContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successTitle: {
    fontSize: 22, fontWeight: '700', color: colors.neutral[900],
    marginTop: 20, marginBottom: 8,
  },
  successDesc: {
    fontSize: 15, color: colors.neutral[500],
    textAlign: 'center', lineHeight: 22,
  },
});
