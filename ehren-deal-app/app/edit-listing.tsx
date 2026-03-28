import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Alert,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { listingService, categoryService } from '@/services';
import { listingSchema, type ListingFormData } from '@/validation/listing';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Chip from '@/components/ui/Chip';
import { LoadingState, ErrorState } from '@/components/layout';
import { colors, spacing } from '@/theme';
import { LISTING_CONDITIONS } from '@/utils/constants';
import type { Category } from '@/types';

export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: listing,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingService.getListing(id!),
    enabled: !!id,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
  });

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    reset,
  } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
  });

  // Formular mit bestehenden Daten fuellen
  useEffect(() => {
    if (listing) {
      reset({
        title: listing.title,
        description: listing.description,
        price: listing.price,
        categoryId: listing.categoryId,
        condition: listing.condition,
        city: listing.city ?? '',
        postalCode: listing.postalCode ?? '',
        shippingAvailable: listing.shippingAvailable,
        pickupAvailable: listing.pickupAvailable,
        priceType: listing.priceType,
      });
    }
  }, [listing, reset]);

  const mutation = useMutation({
    mutationFn: (data: ListingFormData) =>
      listingService.updateListing(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing', id] });
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      router.back();
    },
    onError: () => {
      Alert.alert('Fehler', 'Inserat konnte nicht gespeichert werden.');
    },
  });

  const selectedCondition = watch('condition');
  const selectedCategory = watch('categoryId');

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingState message="Lade Inserat..." />
      </SafeAreaView>
    );
  }

  if (isError || !listing) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState message="Inserat nicht gefunden." onRetry={() => router.back()} />
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
        <Text style={styles.headerTitle}>Inserat bearbeiten</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Bilder Vorschau */}
        {listing.images?.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
            {listing.images.map((img: any) => (
              <Image
                key={img.id}
                source={{ uri: img.url }}
                style={styles.imageThumb}
              />
            ))}
          </ScrollView>
        )}

        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Titel"
              placeholder="Was bietest du an?"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.title?.message}
              style={styles.field}
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Beschreibung"
              placeholder="Beschreibe dein Produkt..."
              multiline
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.description?.message}
              style={styles.field}
            />
          )}
        />

        {/* Kategorie */}
        <Text style={styles.label}>Kategorie</Text>
        <View style={styles.chipsRow}>
          {(categories ?? []).map((cat) => (
            <Chip
              key={cat.id}
              label={cat.name}
              selected={selectedCategory === cat.id}
              onPress={() => setValue('categoryId', cat.id, { shouldDirty: true })}
            />
          ))}
        </View>

        {/* Zustand */}
        <Text style={styles.label}>Zustand</Text>
        <View style={styles.chipsRow}>
          {LISTING_CONDITIONS.map((cond) => (
            <Chip
              key={cond.value}
              label={cond.label}
              selected={selectedCondition === cond.value}
              onPress={() => setValue('condition', cond.value as any, { shouldDirty: true })}
            />
          ))}
        </View>

        <Controller
          control={control}
          name="price"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Preis (in Cent)"
              placeholder="z.B. 5000 fuer 50 EUR"
              keyboardType="number-pad"
              onChangeText={(text) => onChange(parseInt(text) || 0)}
              onBlur={onBlur}
              value={value?.toString() ?? ''}
              error={errors.price?.message}
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

        <Button
          variant="primary"
          fullWidth
          loading={mutation.isPending}
          disabled={!isDirty}
          onPress={handleSubmit((data) => mutation.mutate(data))}
          style={{ marginTop: 8 }}
        >
          Aenderungen speichern
        </Button>
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
  imageRow: { marginBottom: 16 },
  imageThumb: {
    width: 80, height: 80, borderRadius: 8, marginRight: 8,
    backgroundColor: colors.neutral[200],
  },
  field: { marginBottom: 16 },
  label: {
    fontSize: 14, fontWeight: '500', color: colors.neutral[900],
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16,
  },
});
