import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera } from 'lucide-react-native';
import { profileService, uploadService } from '@/services';
import { profileEditSchema, type ProfileEditFormData } from '@/validation/profile';
import { useAuthStore } from '@/store/auth-store';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Avatar from '@/components/ui/Avatar';
import { colors, spacing } from '@/theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile, setProfile } = useAuthStore();
  const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatarUrl ?? null);
  const [uploading, setUploading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileEditFormData>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      displayName: profile?.displayName ?? '',
      bio: profile?.bio ?? '',
      city: profile?.city ?? '',
      postalCode: profile?.postalCode ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ProfileEditFormData) => {
      let finalAvatarUrl = profile?.avatarUrl ?? null;

      if (avatarUri && avatarUri !== profile?.avatarUrl) {
        setUploading(true);
        try {
          finalAvatarUrl = await uploadService.uploadImage(avatarUri);
        } finally {
          setUploading(false);
        }
      }

      return profileService.updateMyProfile({
        ...data,
        avatarUrl: finalAvatarUrl,
      });
    },
    onSuccess: (updatedProfile) => {
      setProfile(updatedProfile);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      router.back();
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
        <Text style={styles.headerTitle}>Profil bearbeiten</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <Pressable onPress={pickAvatar} style={styles.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
            ) : (
              <Avatar
                name={profile?.displayName ?? '?'}
                size="lg"
              />
            )}
            <View style={styles.cameraOverlay}>
              <Camera size={18} color={colors.white} />
            </View>
          </Pressable>
          <Pressable onPress={pickAvatar}>
            <Text style={styles.changePhotoText}>Foto aendern</Text>
          </Pressable>
        </View>

        {/* Form Fields */}
        <Controller
          control={control}
          name="displayName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Anzeigename"
              placeholder="Dein Name"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.displayName?.message}
              style={styles.field}
            />
          )}
        />

        <Controller
          control={control}
          name="bio"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Bio (optional)"
              placeholder="Erzaehle etwas ueber dich..."
              multiline
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.bio?.message}
              style={styles.field}
            />
          )}
        />

        <Controller
          control={control}
          name="city"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Stadt"
              placeholder="z.B. Berlin"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.city?.message}
              style={styles.field}
            />
          )}
        />

        <Controller
          control={control}
          name="postalCode"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Postleitzahl (optional)"
              placeholder="z.B. 10115"
              keyboardType="number-pad"
              maxLength={5}
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.postalCode?.message}
              style={styles.field}
            />
          )}
        />

        <Button
          variant="primary"
          fullWidth
          loading={mutation.isPending || uploading}
          disabled={!isDirty && avatarUri === profile?.avatarUrl}
          onPress={handleSubmit((data) => mutation.mutate(data))}
          style={{ marginTop: 8 }}
        >
          Speichern
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
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
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, fontSize: 17, fontWeight: '600',
    color: colors.neutral[900], textAlign: 'center',
  },
  scroll: { padding: spacing.md, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarWrap: { position: 'relative', marginBottom: 8 },
  avatarImg: { width: 96, height: 96, borderRadius: 48 },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primary[500],
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.white,
  },
  changePhotoText: {
    fontSize: 14, fontWeight: '500', color: colors.primary[500],
  },
  field: { marginBottom: 16 },
});
