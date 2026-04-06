import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Pressable,
  Image,
  TextInput,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  MapPin,
  Truck,
  Package,
  Image as ImageIcon,
  FileText,
  Euro,
  Eye,
} from 'lucide-react-native';
import { listingService, categoryService, uploadService } from '@/services';
import { listingSchema, type ListingFormData } from '@/validation/listing';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme';
import { formatPrice } from '@/utils/format';
import type { Category } from '@/types';
import { Button, Input } from '@/components/ui';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;
const MAX_IMAGES = 10;
const STEPS = ['Fotos', 'Details', 'Preis & Versand', 'Vorschau'];
const STEP_ICONS = [ImageIcon, FileText, Euro, Eye];

const CONDITION_OPTIONS = [
  { value: 'NEW' as const, label: 'Neu' },
  { value: 'LIKE_NEW' as const, label: 'Wie neu' },
  { value: 'GOOD' as const, label: 'Gut' },
  { value: 'ACCEPTABLE' as const, label: 'Akzeptabel' },
  { value: 'DEFECTIVE' as const, label: 'Defekt' },
];

const PRICE_TYPE_OPTIONS = [
  { value: 'FIXED' as const, label: 'Festpreis' },
  { value: 'NEGOTIABLE' as const, label: 'Verhandlungsbasis' },
  { value: 'FREE' as const, label: 'Zu verschenken' },
];

// ─── Create Listing Screen ───────────────────────────────────────────────────

export default function CreateListingScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: '',
      description: '',
      categoryId: '',
      price: 0,
      priceType: 'FIXED',
      condition: 'GOOD',
      city: '',
      postalCode: '',
      shippingAvailable: false,
      pickupAvailable: true,
    },
  });

  const watchedValues = watch();

  const categoriesQuery = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
  });

  const selectedCategory = categoriesQuery.data?.find(
    (c) => c.id === watchedValues.categoryId,
  );

  // ─── Image Picker ─────────────────────────────────────────────────

  const pickImages = useCallback(async () => {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      Alert.alert('Maximum erreicht', `Du kannst maximal ${MAX_IMAGES} Bilder hochladen.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...newUris].slice(0, MAX_IMAGES));
    }
  }, [images.length]);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ─── Step Navigation ──────────────────────────────────────────────

  const canGoNext = useCallback(async (): Promise<boolean> => {
    switch (currentStep) {
      case 0:
        if (images.length < 1) {
          Alert.alert('Fotos erforderlich', 'Bitte fuege mindestens ein Foto hinzu.');
          return false;
        }
        return true;
      case 1: {
        const valid = await trigger(['title', 'categoryId', 'condition', 'description']);
        return valid;
      }
      case 2: {
        const valid = await trigger(['price', 'priceType', 'city', 'shippingAvailable', 'pickupAvailable']);
        return valid;
      }
      default:
        return true;
    }
  }, [currentStep, images.length, trigger]);

  const goNext = useCallback(async () => {
    const valid = await canGoNext();
    if (valid && currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [canGoNext, currentStep]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  // ─── Submit ───────────────────────────────────────────────────────

  const onSubmit = useCallback(
    async (data: ListingFormData) => {
      try {
        setIsSubmitting(true);

        // Upload images
        const uploadedUrls: string[] = [];
        for (const uri of images) {
          const url = await uploadService.uploadImage(uri);
          uploadedUrls.push(url);
        }

        // Create listing
        const result = await listingService.createListing({
          ...data,
          images: uploadedUrls.map((url, index) => ({
            url,
            position: index,
          })),
        });

        setCreatedListingId(result.id);
      } catch (error: any) {
        Alert.alert(
          'Fehler',
          error?.message || 'Inserat konnte nicht erstellt werden.',
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [images],
  );

  // ─── Success Screen ──────────────────────────────────────────────

  if (createdListingId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Check size={40} color={colors.white} />
          </View>
          <Text style={styles.successTitle}>Inserat erstellt!</Text>
          <Text style={styles.successSubtitle}>
            Dein Inserat wurde erfolgreich veroeffentlicht.
          </Text>

          <Button
            fullWidth
            onPress={() => router.push(`/listing/${createdListingId}`)}
            style={{ marginTop: spacing.lg }}
          >
            Inserat ansehen
          </Button>

          <Button
            variant="tertiary"
            fullWidth
            onPress={() => router.push('/(tabs)')}
            style={{ marginTop: spacing.sm }}
          >
            Zurueck zur Startseite
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Progress Bar ─────────────────────────────────────────────────

  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inserat erstellen</Text>
        <Text style={styles.headerStep}>
          Schritt {currentStep + 1} von {STEPS.length}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View
          style={[styles.progressFill, { width: `${progressPercent}%` }]}
        />
      </View>

      {/* Step Indicators */}
      <View style={styles.stepIndicators}>
        {STEPS.map((step, index) => {
          const Icon = STEP_ICONS[index];
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <View key={step} style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  isActive && styles.stepCircleActive,
                  isCompleted && styles.stepCircleCompleted,
                ]}
              >
                {isCompleted ? (
                  <Check size={14} color={colors.white} />
                ) : (
                  <Icon
                    size={14}
                    color={
                      isActive ? colors.white : colors.neutral[400]
                    }
                  />
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  (isActive || isCompleted) && styles.stepLabelActive,
                ]}
              >
                {step}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Step Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Step 1: Photos ───────────────────────────────────── */}
        {currentStep === 0 && (
          <View>
            <Text style={styles.stepTitle}>Fotos hinzufuegen</Text>
            <Text style={styles.stepDescription}>
              Mindestens 1 Foto, maximal {MAX_IMAGES}. Das erste Bild wird als
              Cover verwendet.
            </Text>

            <View style={styles.imageGrid}>
              {images.map((uri, index) => (
                <View key={uri} style={styles.imageItem}>
                  <Image source={{ uri }} style={styles.imagePreview} />
                  {index === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>Cover</Text>
                    </View>
                  )}
                  <Pressable
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                    hitSlop={8}
                  >
                    <X size={14} color={colors.white} />
                  </Pressable>
                </View>
              ))}

              {images.length < MAX_IMAGES && (
                <Pressable style={styles.addImageButton} onPress={pickImages}>
                  <Plus size={24} color={colors.primary[500]} />
                  <Text style={styles.addImageText}>Hinzufuegen</Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.imageCount}>
              {images.length}/{MAX_IMAGES} Bilder
            </Text>
          </View>
        )}

        {/* ─── Step 2: Details ──────────────────────────────────── */}
        {currentStep === 1 && (
          <View>
            <Text style={styles.stepTitle}>Details</Text>

            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Titel"
                  placeholder="z.B. iPhone 14 Pro Max 256GB"
                  value={value}
                  onChangeText={onChange}
                  error={errors.title?.message}
                  style={{ marginBottom: spacing.md }}
                />
              )}
            />

            <View style={{ marginBottom: spacing.md }}>
              <Text style={styles.inputLabel}>Kategorie</Text>
              <Pressable
                style={[
                  styles.selectButton,
                  errors.categoryId && styles.selectButtonError,
                ]}
                onPress={() => setShowCategoryModal(true)}
              >
                <Text
                  style={[
                    styles.selectButtonText,
                    !selectedCategory && styles.selectButtonPlaceholder,
                  ]}
                >
                  {selectedCategory
                    ? `${selectedCategory.icon || ''} ${selectedCategory.name}`
                    : 'Kategorie waehlen'}
                </Text>
                <ChevronRight size={18} color={colors.neutral[400]} />
              </Pressable>
              {errors.categoryId && (
                <Text style={styles.errorText}>{errors.categoryId.message}</Text>
              )}
            </View>

            <View style={{ marginBottom: spacing.md }}>
              <Text style={styles.inputLabel}>Zustand</Text>
              <Controller
                control={control}
                name="condition"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.chipRow}>
                    {CONDITION_OPTIONS.map((opt) => (
                      <Pressable
                        key={opt.value}
                        onPress={() => onChange(opt.value)}
                        style={[
                          styles.conditionChip,
                          value === opt.value && styles.conditionChipSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.conditionChipText,
                            value === opt.value &&
                              styles.conditionChipTextSelected,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              />
            </View>

            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Beschreibung"
                  placeholder="Beschreibe deinen Artikel..."
                  value={value}
                  onChangeText={onChange}
                  error={errors.description?.message}
                  multiline
                  style={{ marginBottom: spacing.md }}
                />
              )}
            />
          </View>
        )}

        {/* ─── Step 3: Price & Shipping ─────────────────────────── */}
        {currentStep === 2 && (
          <View>
            <Text style={styles.stepTitle}>Preis & Versand</Text>

            <View style={{ marginBottom: spacing.md }}>
              <Text style={styles.inputLabel}>Preistyp</Text>
              <Controller
                control={control}
                name="priceType"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.radioGroup}>
                    {PRICE_TYPE_OPTIONS.map((opt) => (
                      <Pressable
                        key={opt.value}
                        onPress={() => onChange(opt.value)}
                        style={styles.radioRow}
                      >
                        <View
                          style={[
                            styles.radioOuter,
                            value === opt.value && styles.radioOuterSelected,
                          ]}
                        >
                          {value === opt.value && (
                            <View style={styles.radioInner} />
                          )}
                        </View>
                        <Text style={styles.radioLabel}>{opt.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              />
            </View>

            {watchedValues.priceType !== 'FREE' && (
              <Controller
                control={control}
                name="price"
                render={({ field: { onChange, value } }) => (
                  <View style={{ marginBottom: spacing.md }}>
                    <Text style={styles.inputLabel}>Preis (in Cent)</Text>
                    <View style={styles.priceInputContainer}>
                      <TextInput
                        style={styles.priceInput}
                        placeholder="0"
                        placeholderTextColor={colors.neutral[400]}
                        keyboardType="numeric"
                        value={value ? String(value) : ''}
                        onChangeText={(text) => {
                          const num = parseInt(text, 10);
                          onChange(isNaN(num) ? 0 : num);
                        }}
                        selectionColor={colors.primary[500]}
                      />
                      <Text style={styles.priceUnit}>EUR (Cent)</Text>
                    </View>
                    {errors.price && (
                      <Text style={styles.errorText}>{errors.price.message}</Text>
                    )}
                  </View>
                )}
              />
            )}

            <Controller
              control={control}
              name="city"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Standort"
                  placeholder="z.B. Berlin"
                  value={value}
                  onChangeText={onChange}
                  error={errors.city?.message}
                  leftIcon={<MapPin size={18} color={colors.neutral[400]} />}
                  style={{ marginBottom: spacing.md }}
                />
              )}
            />

            <Controller
              control={control}
              name="postalCode"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Postleitzahl (optional)"
                  placeholder="z.B. 10115"
                  value={value ?? ''}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  style={{ marginBottom: spacing.lg }}
                />
              )}
            />

            <View style={styles.toggleSection}>
              <Controller
                control={control}
                name="shippingAvailable"
                render={({ field: { onChange, value } }) => (
                  <Pressable
                    style={[
                      styles.toggleCard,
                      value && styles.toggleCardActive,
                    ]}
                    onPress={() => onChange(!value)}
                  >
                    <Truck
                      size={22}
                      color={value ? colors.primary[500] : colors.neutral[400]}
                    />
                    <Text
                      style={[
                        styles.toggleLabel,
                        value && styles.toggleLabelActive,
                      ]}
                    >
                      Versand moeglich
                    </Text>
                    {value && <Check size={18} color={colors.primary[500]} />}
                  </Pressable>
                )}
              />

              <Controller
                control={control}
                name="pickupAvailable"
                render={({ field: { onChange, value } }) => (
                  <Pressable
                    style={[
                      styles.toggleCard,
                      value && styles.toggleCardActive,
                    ]}
                    onPress={() => onChange(!value)}
                  >
                    <Package
                      size={22}
                      color={value ? colors.primary[500] : colors.neutral[400]}
                    />
                    <Text
                      style={[
                        styles.toggleLabel,
                        value && styles.toggleLabelActive,
                      ]}
                    >
                      Abholung moeglich
                    </Text>
                    {value && <Check size={18} color={colors.primary[500]} />}
                  </Pressable>
                )}
              />
            </View>
          </View>
        )}

        {/* ─── Step 4: Preview ──────────────────────────────────── */}
        {currentStep === 3 && (
          <View>
            <Text style={styles.stepTitle}>Vorschau</Text>
            <Text style={styles.stepDescription}>
              So wird dein Inserat aussehen:
            </Text>

            {/* Preview Card */}
            <View style={styles.previewCard}>
              {images[0] && (
                <Image
                  source={{ uri: images[0] }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              )}

              <View style={styles.previewContent}>
                <Text style={styles.previewTitle}>
                  {watchedValues.title || 'Kein Titel'}
                </Text>

                <Text style={styles.previewPrice}>
                  {watchedValues.priceType === 'FREE'
                    ? 'Zu verschenken'
                    : formatPrice(watchedValues.price)}
                  {watchedValues.priceType === 'NEGOTIABLE' ? ' VB' : ''}
                </Text>

                {selectedCategory && (
                  <View style={styles.previewMeta}>
                    <Text style={styles.previewMetaText}>
                      {selectedCategory.icon || ''} {selectedCategory.name}
                    </Text>
                  </View>
                )}

                <View style={styles.previewMeta}>
                  <MapPin size={14} color={colors.neutral[500]} />
                  <Text style={styles.previewMetaText}>
                    {watchedValues.city || 'Kein Standort'}
                  </Text>
                </View>

                <View style={styles.previewMeta}>
                  <Package size={14} color={colors.neutral[500]} />
                  <Text style={styles.previewMetaText}>
                    {CONDITION_OPTIONS.find(
                      (o) => o.value === watchedValues.condition,
                    )?.label || watchedValues.condition}
                  </Text>
                </View>

                <View style={styles.previewBadges}>
                  {watchedValues.shippingAvailable && (
                    <View style={styles.previewBadge}>
                      <Truck size={12} color={colors.primary[600]} />
                      <Text style={styles.previewBadgeText}>Versand</Text>
                    </View>
                  )}
                  {watchedValues.pickupAvailable && (
                    <View style={styles.previewBadge}>
                      <MapPin size={12} color={colors.success[600]} />
                      <Text
                        style={[
                          styles.previewBadgeText,
                          { color: colors.success[600] },
                        ]}
                      >
                        Abholung
                      </Text>
                    </View>
                  )}
                </View>

                {watchedValues.description ? (
                  <Text style={styles.previewDescription} numberOfLines={3}>
                    {watchedValues.description}
                  </Text>
                ) : null}

                <Text style={styles.previewImageCount}>
                  {images.length} Foto{images.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navBar}>
        {currentStep > 0 ? (
          <Pressable style={styles.navBackButton} onPress={goBack}>
            <ChevronLeft size={20} color={colors.neutral[700]} />
            <Text style={styles.navBackText}>Zurueck</Text>
          </Pressable>
        ) : (
          <View />
        )}

        {currentStep < STEPS.length - 1 ? (
          <Pressable style={styles.navNextButton} onPress={goNext}>
            <Text style={styles.navNextText}>Weiter</Text>
            <ChevronRight size={20} color={colors.white} />
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.navNextButton,
              isSubmitting && { opacity: 0.6 },
            ]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Check size={20} color={colors.white} />
                <Text style={styles.navNextText}>Veroeffentlichen</Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {/* ─── Category Modal ────────────────────────────────────── */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCategoryModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Kategorie waehlen</Text>

            <FlatList
              data={categoriesQuery.data ?? []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.modalOption,
                    watchedValues.categoryId === item.id &&
                      styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setValue('categoryId', item.id);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text style={styles.modalOptionIcon}>
                    {item.icon || ''}
                  </Text>
                  <Text
                    style={[
                      styles.modalOptionText,
                      watchedValues.categoryId === item.id &&
                        styles.modalOptionTextSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {watchedValues.categoryId === item.id && (
                    <Check size={18} color={colors.primary[500]} />
                  )}
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const IMAGE_ITEM_SIZE = (SCREEN_WIDTH - spacing.md * 2 - spacing.sm * 2) / 3;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  headerTitle: {
    ...typography.h2,
  },
  headerStep: {
    ...typography.caption,
    marginTop: 2,
  },

  // Progress
  progressBar: {
    height: 3,
    backgroundColor: colors.neutral[200],
    marginHorizontal: spacing.md,
    borderRadius: 2,
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: 2,
  },

  // Step Indicators
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: colors.primary[500],
  },
  stepCircleCompleted: {
    backgroundColor: colors.success[500],
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.neutral[400],
  },
  stepLabelActive: {
    color: colors.neutral[700],
    fontWeight: '600',
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  stepTitle: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  stepDescription: {
    ...typography.body,
    color: colors.neutral[500],
    marginBottom: spacing.md,
  },

  // Step 1: Images
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  imageItem: {
    width: IMAGE_ITEM_SIZE,
    height: IMAGE_ITEM_SIZE,
    borderRadius: radius.card,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: colors.primary[500],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coverBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageButton: {
    width: IMAGE_ITEM_SIZE,
    height: IMAGE_ITEM_SIZE,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.primary[200],
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[50],
    gap: 4,
  },
  addImageText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.primary[500],
  },
  imageCount: {
    ...typography.caption,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  // Step 2: Details
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[900],
    marginBottom: 6,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: radius.input,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
  },
  selectButtonError: {
    borderColor: colors.error[500],
  },
  selectButtonText: {
    fontSize: 15,
    color: colors.neutral[900],
  },
  selectButtonPlaceholder: {
    color: colors.neutral[400],
  },
  errorText: {
    fontSize: 12,
    color: colors.error[500],
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  conditionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    backgroundColor: colors.surface,
  },
  conditionChipSelected: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  conditionChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.neutral[600],
  },
  conditionChipTextSelected: {
    color: colors.white,
  },

  // Step 3: Price
  radioGroup: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary[500],
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary[500],
  },
  radioLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.neutral[700],
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: radius.input,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: colors.white,
  },
  priceInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[900],
    height: '100%',
    paddingVertical: 0,
  },
  priceUnit: {
    fontSize: 14,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  toggleSection: {
    gap: spacing.sm,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.surface,
  },
  toggleCardActive: {
    borderColor: colors.primary[300],
    backgroundColor: colors.primary[50],
  },
  toggleLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.neutral[600],
  },
  toggleLabelActive: {
    color: colors.primary[700],
  },

  // Step 4: Preview
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewImage: {
    width: '100%',
    height: 220,
  },
  previewContent: {
    padding: spacing.md,
  },
  previewTitle: {
    ...typography.h2,
    marginBottom: 4,
  },
  previewPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  previewMetaText: {
    fontSize: 14,
    color: colors.neutral[600],
  },
  previewBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.primary[50],
  },
  previewBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary[600],
  },
  previewDescription: {
    ...typography.body,
    marginTop: spacing.sm,
  },
  previewImageCount: {
    ...typography.caption,
    marginTop: spacing.sm,
  },

  // Navigation
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    backgroundColor: colors.surface,
  },
  navBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  navBackText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.neutral[700],
  },
  navNextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary[500],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radius.button,
  },
  navNextText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },

  // Success
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.success[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  successSubtitle: {
    ...typography.body,
    textAlign: 'center',
    color: colors.neutral[500],
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral[300],
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    gap: spacing.sm,
  },
  modalOptionSelected: {
    backgroundColor: colors.primary[50],
  },
  modalOptionIcon: {
    fontSize: 18,
  },
  modalOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.neutral[700],
  },
  modalOptionTextSelected: {
    color: colors.primary[600],
    fontWeight: '600',
  },
});
