import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera,
  MapPin,
  ChevronRight,
  Check,
  User,
} from 'lucide-react-native';
import { profileService, uploadService } from '@/services';
import { useAuthStore } from '@/store/auth-store';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { colors, spacing } from '@/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STEPS = [
  { title: 'Profilbild', subtitle: 'Zeige den anderen, wer du bist' },
  { title: 'Standort', subtitle: 'Inserate in deiner Naehe finden' },
  { title: 'Fertig', subtitle: 'Du bist bereit!' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { profile, setProfile } = useAuthStore();
  const [step, setStep] = useState(0);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [uploading, setUploading] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let avatarUrl = profile?.avatarUrl ?? null;

      if (avatarUri) {
        setUploading(true);
        try {
          avatarUrl = await uploadService.uploadImage(avatarUri);
        } finally {
          setUploading(false);
        }
      }

      return profileService.updateMyProfile({
        avatarUrl,
        city: city || undefined,
        onboardingCompleted: true,
      });
    },
    onSuccess: (updated) => {
      setProfile(updated);
      router.replace('/(tabs)');
    },
    onError: () => {
      Alert.alert('Fehler', 'Profil konnte nicht gespeichert werden.');
    },
  });

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  function skip() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      saveMutation.mutate();
    }
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      saveMutation.mutate();
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Progress */}
      <View style={styles.progressRow}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i <= step && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      {/* Skip */}
      {step < STEPS.length - 1 && (
        <Pressable onPress={skip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Ueberspringen</Text>
        </Pressable>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Step 0: Avatar */}
        {step === 0 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{STEPS[0].title}</Text>
            <Text style={styles.stepSubtitle}>{STEPS[0].subtitle}</Text>

            <Pressable onPress={pickAvatar} style={styles.avatarPicker}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Camera size={36} color={colors.neutral[400]} />
                  <Text style={styles.avatarHint}>Foto waehlen</Text>
                </View>
              )}
            </Pressable>

            <Button variant="primary" fullWidth onPress={next} style={styles.nextBtn}>
              <View style={styles.nextBtnContent}>
                <Text style={styles.nextBtnText}>
                  {avatarUri ? 'Weiter' : 'Ohne Foto fortfahren'}
                </Text>
                <ChevronRight size={18} color={colors.white} />
              </View>
            </Button>
          </View>
        )}

        {/* Step 1: Location */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{STEPS[1].title}</Text>
            <Text style={styles.stepSubtitle}>{STEPS[1].subtitle}</Text>

            <View style={styles.locationIcon}>
              <MapPin size={48} color={colors.primary[500]} />
            </View>

            <Input
              label="In welcher Stadt bist du?"
              placeholder="z.B. Berlin, Muenchen, Hamburg..."
              onChangeText={setCity}
              value={city}
              leftIcon={<MapPin size={18} color={colors.neutral[400]} />}
              style={styles.locationInput}
            />

            <Button variant="primary" fullWidth onPress={next} style={styles.nextBtn}>
              <View style={styles.nextBtnContent}>
                <Text style={styles.nextBtnText}>Weiter</Text>
                <ChevronRight size={18} color={colors.white} />
              </View>
            </Button>
          </View>
        )}

        {/* Step 2: Done */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.doneIcon}>
              <Check size={48} color={colors.success[500]} />
            </View>
            <Text style={styles.stepTitle}>Alles bereit!</Text>
            <Text style={styles.stepSubtitle}>
              Dein Profil ist eingerichtet. Du kannst jetzt Inserate erstellen,
              kaufen und mit anderen Nutzern kommunizieren.
            </Text>

            <Button
              variant="primary"
              fullWidth
              loading={saveMutation.isPending || uploading}
              onPress={() => saveMutation.mutate()}
              style={styles.nextBtn}
            >
              Los geht's
            </Button>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  progressRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 8, paddingTop: 16, paddingBottom: 8,
  },
  progressDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.neutral[200],
  },
  progressDotActive: { backgroundColor: colors.primary[500], width: 24 },
  skipBtn: {
    position: 'absolute', top: 16, right: 16, zIndex: 1,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  skipText: { fontSize: 14, color: colors.neutral[500] },
  scroll: {
    flexGrow: 1, justifyContent: 'center',
    padding: spacing.xl, paddingBottom: 40,
  },
  stepContainer: { alignItems: 'center' },
  stepTitle: {
    fontSize: 26, fontWeight: '700', color: colors.neutral[900],
    textAlign: 'center', marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15, color: colors.neutral[500],
    textAlign: 'center', lineHeight: 22, marginBottom: 32,
  },
  avatarPicker: {
    width: 140, height: 140, borderRadius: 70,
    overflow: 'hidden', marginBottom: 32,
  },
  avatarImage: { width: 140, height: 140 },
  avatarPlaceholder: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: colors.neutral[100],
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.neutral[200], borderStyle: 'dashed',
  },
  avatarHint: {
    fontSize: 13, color: colors.neutral[400], marginTop: 8,
  },
  locationIcon: { marginBottom: 24 },
  locationInput: { width: '100%', marginBottom: 16 },
  doneIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.success[50],
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  nextBtn: { marginTop: 16 },
  nextBtnContent: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  nextBtnText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
