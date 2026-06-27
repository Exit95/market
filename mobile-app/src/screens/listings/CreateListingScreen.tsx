import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Image,
    ActivityIndicator,
    Alert,
    Switch,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';
import { post } from '../../api/client';

type Props = NativeStackScreenProps<any, 'CreateListing'>;

const STEPS = ['Kategorie', 'Details', 'Fotos', 'Vorschau'] as const;

const CATEGORIES = [
    { id: 'elektronik', name: 'Elektronik', icon: 'laptop-outline' as const },
    { id: 'mode-bekleidung', name: 'Mode & Bekleidung', icon: 'shirt-outline' as const },
    { id: 'moebel-wohnen', name: 'Möbel & Wohnen', icon: 'bed-outline' as const },
    { id: 'fahrzeuge', name: 'Fahrzeuge', icon: 'car-outline' as const },
    { id: 'sport-freizeit', name: 'Sport & Freizeit', icon: 'football-outline' as const },
    { id: 'haushalt', name: 'Haushalt', icon: 'home-outline' as const },
    { id: 'spielzeug', name: 'Spielzeug', icon: 'game-controller-outline' as const },
    { id: 'buecher-medien', name: 'Bücher & Medien', icon: 'book-outline' as const },
    { id: 'mieten-kaufen', name: 'Mieten & Kaufen', icon: 'business-outline' as const },
];

const CONDITIONS = [
    { id: 'new', name: 'Neu' },
    { id: 'like_new', name: 'Wie neu' },
    { id: 'good', name: 'Gut' },
    { id: 'acceptable', name: 'Akzeptabel' },
];

interface ImageAsset {
    uri: string;
    fileName?: string;
    type?: string;
}

export default function CreateListingScreen({ navigation }: Props) {
    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    // Form data
    const [category, setCategory] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [condition, setCondition] = useState('');
    const [city, setCity] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [treuhand, setTreuhand] = useState(true);
    const [images, setImages] = useState<ImageAsset[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateStep = (): boolean => {
        const e: Record<string, string> = {};
        if (step === 0 && !category) e.category = 'Bitte wähle eine Kategorie';
        if (step === 1) {
            if (!title.trim()) e.title = 'Titel ist erforderlich';
            if (!price.trim()) e.price = 'Preis ist erforderlich';
            else if (isNaN(Number(price)) || Number(price) <= 0) e.price = 'Ungültiger Preis';
            if (!condition) e.condition = 'Bitte wähle einen Zustand';
            if (!city.trim()) e.city = 'Ort ist erforderlich';
            if (!postalCode.trim()) e.postalCode = 'PLZ ist erforderlich';
        }
        if (step === 2 && images.length === 0) e.images = 'Mindestens ein Foto erforderlich';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleNext = () => {
        if (!validateStep()) return;
        if (step < STEPS.length - 1) setStep(step + 1);
        else handleSubmit();
    };

    const handleBack = () => {
        if (step > 0) setStep(step - 1);
        else navigation.goBack();
    };

    const pickImages = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Berechtigung', 'Wir benötigen Zugriff auf deine Fotos.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
            selectionLimit: 8 - images.length,
        });
        if (!result.canceled && result.assets) {
            setImages([...images, ...result.assets.map((a) => ({ uri: a.uri, fileName: a.fileName ?? undefined, type: a.type ?? 'image/jpeg' }))]);
            setErrors((e) => ({ ...e, images: '' }));
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Berechtigung', 'Wir benötigen Zugriff auf deine Kamera.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
        if (!result.canceled && result.assets[0]) {
            const a = result.assets[0];
            setImages([...images, { uri: a.uri, fileName: a.fileName ?? undefined, type: a.type ?? 'image/jpeg' }]);
            setErrors((e) => ({ ...e, images: '' }));
        }
    };

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('price', String(Math.round(Number(price) * 100)));
            formData.append('category', category);
            formData.append('condition', condition);
            formData.append('city', city);
            formData.append('postalCode', postalCode);
            formData.append('treuhand', String(treuhand));
            images.forEach((img, i) => {
                formData.append('images', {
                    uri: img.uri,
                    name: img.fileName ?? `photo_${i}.jpg`,
                    type: img.type ?? 'image/jpeg',
                } as any);
            });

            const res = await post<{ listing: { id: string } }>('/api/listings', formData);
            if (res.ok) {
                Alert.alert('Erfolg', 'Dein Inserat wurde erstellt!', [
                    { text: 'Ansehen', onPress: () => navigation.replace('ListingDetail', { id: res.data.listing.id }) },
                ]);
            } else {
                Alert.alert('Fehler', 'Inserat konnte nicht erstellt werden.');
            }
        } catch {
            Alert.alert('Fehler', 'Verbindungsfehler. Bitte versuche es erneut.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatPrice = (val: string) =>
        val ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(val)) : '';

    const renderProgress = () => (
        <View style={styles.progressBar}>
            {STEPS.map((label, i) => (
                <View key={label} style={styles.progressItem}>
                    <View style={[styles.progressDot, i <= step && styles.progressDotActive, i < step && styles.progressDotDone]}>
                        {i < step ? (
                            <Ionicons name="checkmark" size={12} color={colors.white} />
                        ) : (
                            <Text style={[styles.progressNum, i <= step && styles.progressNumActive]}>{i + 1}</Text>
                        )}
                    </View>
                    <Text style={[styles.progressLabel, i <= step && styles.progressLabelActive]} numberOfLines={1}>
                        {label}
                    </Text>
                </View>
            ))}
            <View style={styles.progressLineContainer}>
                <View style={[styles.progressLineFill, { width: `${(step / (STEPS.length - 1)) * 100}%` }]} />
            </View>
        </View>
    );

    const renderStepCategory = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Kategorie wählen</Text>
            <Text style={styles.stepSubtitle}>In welche Kategorie passt dein Artikel?</Text>
            {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}
            <View style={styles.categoryGrid}>
                {CATEGORIES.map((c) => (
                    <TouchableOpacity
                        key={c.id}
                        style={[styles.categoryCard, category === c.id && styles.categoryCardActive]}
                        onPress={() => { setCategory(c.id); setErrors((e) => ({ ...e, category: '' })); }}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={c.icon}
                            size={28}
                            color={category === c.id ? colors.primary : colors.textMuted}
                        />
                        <Text style={[styles.categoryLabel, category === c.id && styles.categoryLabelActive]}>
                            {c.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderStepDetails = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Artikeldetails</Text>

            <View style={styles.field}>
                <Text style={styles.label}>Titel</Text>
                <TextInput
                    style={[styles.input, errors.title && styles.inputError]}
                    placeholder="z.B. iPhone 15 Pro 256GB"
                    placeholderTextColor={colors.textMuted}
                    value={title}
                    onChangeText={(t) => { setTitle(t); setErrors((e) => ({ ...e, title: '' })); }}
                    maxLength={100}
                />
                {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}
                <Text style={styles.charCount}>{title.length}/100</Text>
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>Beschreibung</Text>
                <TextInput
                    style={[styles.input, styles.textArea, errors.description && styles.inputError]}
                    placeholder="Beschreibe deinen Artikel ausführlich..."
                    placeholderTextColor={colors.textMuted}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    maxLength={2000}
                />
                <Text style={styles.charCount}>{description.length}/2000</Text>
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>Preis (EUR)</Text>
                <TextInput
                    style={[styles.input, errors.price && styles.inputError]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    value={price}
                    onChangeText={(t) => { setPrice(t.replace(',', '.')); setErrors((e) => ({ ...e, price: '' })); }}
                    keyboardType="decimal-pad"
                />
                {errors.price ? <Text style={styles.errorText}>{errors.price}</Text> : null}
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>Zustand</Text>
                {errors.condition ? <Text style={styles.errorText}>{errors.condition}</Text> : null}
                <View style={styles.chipRow}>
                    {CONDITIONS.map((c) => (
                        <TouchableOpacity
                            key={c.id}
                            style={[styles.chip, condition === c.id && styles.chipActive]}
                            onPress={() => { setCondition(c.id); setErrors((e) => ({ ...e, condition: '' })); }}
                        >
                            <Text style={[styles.chipText, condition === c.id && styles.chipTextActive]}>{c.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.row}>
                <View style={[styles.field, { flex: 2 }]}>
                    <Text style={styles.label}>Ort</Text>
                    <TextInput
                        style={[styles.input, errors.city && styles.inputError]}
                        placeholder="Berlin"
                        placeholderTextColor={colors.textMuted}
                        value={city}
                        onChangeText={(t) => { setCity(t); setErrors((e) => ({ ...e, city: '' })); }}
                    />
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>PLZ</Text>
                    <TextInput
                        style={[styles.input, errors.postalCode && styles.inputError]}
                        placeholder="10115"
                        placeholderTextColor={colors.textMuted}
                        value={postalCode}
                        onChangeText={(t) => { setPostalCode(t); setErrors((e) => ({ ...e, postalCode: '' })); }}
                        keyboardType="numeric"
                        maxLength={5}
                    />
                </View>
            </View>

            <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                    <View style={styles.switchLabelRow}>
                        <Ionicons name="shield-checkmark" size={20} color={colors.success} />
                        <Text style={styles.label}>Treuhand-Schutz aktivieren</Text>
                    </View>
                    <Text style={styles.switchHint}>Erhöht das Vertrauen der Käufer deutlich</Text>
                </View>
                <Switch
                    value={treuhand}
                    onValueChange={setTreuhand}
                    trackColor={{ true: colors.success, false: colors.border }}
                    thumbColor={colors.white}
                />
            </View>
        </View>
    );

    const renderStepPhotos = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Fotos hinzufügen</Text>
            <Text style={styles.stepSubtitle}>Bis zu 8 Fotos. Das erste Foto wird als Titelbild verwendet.</Text>
            {errors.images ? <Text style={styles.errorText}>{errors.images}</Text> : null}

            <View style={styles.imageGrid}>
                {images.map((img, i) => (
                    <View key={i} style={styles.imageThumb}>
                        <Image source={{ uri: img.uri }} style={styles.imageThumbImg} />
                        <TouchableOpacity style={styles.imageRemove} onPress={() => removeImage(i)}>
                            <Ionicons name="close-circle" size={22} color={colors.danger} />
                        </TouchableOpacity>
                        {i === 0 && (
                            <View style={styles.mainImageBadge}>
                                <Text style={styles.mainImageText}>Titelbild</Text>
                            </View>
                        )}
                    </View>
                ))}
                {images.length < 8 && (
                    <View style={styles.addImageButtons}>
                        <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
                            <Ionicons name="images-outline" size={28} color={colors.primary} />
                            <Text style={styles.addImageText}>Galerie</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.addImageBtn} onPress={takePhoto}>
                            <Ionicons name="camera-outline" size={28} color={colors.primary} />
                            <Text style={styles.addImageText}>Kamera</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );

    const renderStepPreview = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Vorschau</Text>
            <Text style={styles.stepSubtitle}>Prüfe dein Inserat bevor du es veröffentlichst.</Text>

            <View style={styles.previewCard}>
                {images[0] && (
                    <Image source={{ uri: images[0].uri }} style={styles.previewImage} />
                )}
                <View style={styles.previewBody}>
                    <Text style={styles.previewPrice}>{formatPrice(price)}</Text>
                    <Text style={styles.previewTitle}>{title}</Text>
                    <View style={styles.previewMeta}>
                        <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.previewMetaText}>{postalCode} {city}</Text>
                    </View>
                    <View style={styles.previewMeta}>
                        <Ionicons name="pricetag-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.previewMetaText}>
                            {CATEGORIES.find((c) => c.id === category)?.name} · {CONDITIONS.find((c) => c.id === condition)?.name}
                        </Text>
                    </View>
                    {treuhand && (
                        <View style={styles.previewTreuhand}>
                            <Ionicons name="shield-checkmark" size={14} color={colors.success} />
                            <Text style={styles.previewTreuhandText}>Mit Treuhand-Schutz</Text>
                        </View>
                    )}
                    {description.length > 0 && (
                        <Text style={styles.previewDesc} numberOfLines={4}>{description}</Text>
                    )}
                    <Text style={styles.previewImageCount}>{images.length} Foto{images.length !== 1 ? 's' : ''}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={handleBack} style={styles.topBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.navy} />
                </TouchableOpacity>
                <Text style={styles.topTitle}>Inserat erstellen</Text>
                <View style={{ width: 40 }} />
            </View>

            {renderProgress()}

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                {step === 0 && renderStepCategory()}
                {step === 1 && renderStepDetails()}
                {step === 2 && renderStepPhotos()}
                {step === 3 && renderStepPreview()}
            </ScrollView>

            <View style={styles.bottomBar}>
                {step > 0 && (
                    <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                        <Text style={styles.backButtonText}>Zurück</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[styles.nextButton, submitting && styles.nextButtonDisabled, step === 0 && { flex: 1 }]}
                    onPress={handleNext}
                    disabled={submitting}
                    activeOpacity={0.8}
                >
                    {submitting ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <Text style={styles.nextButtonText}>
                            {step === STEPS.length - 1 ? 'Inserat veröffentlichen' : 'Weiter'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    topBtn: { padding: spacing.xs },
    topTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.navy },
    progressBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
        position: 'relative',
    },
    progressItem: { alignItems: 'center', zIndex: 1 },
    progressDot: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressDotActive: { backgroundColor: colors.primary },
    progressDotDone: { backgroundColor: colors.success },
    progressNum: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted },
    progressNumActive: { color: colors.white },
    progressLabel: { fontSize: 10, color: colors.textMuted, marginTop: 3 },
    progressLabelActive: { color: colors.primary, fontWeight: fontWeight.medium },
    progressLineContainer: {
        position: 'absolute',
        left: spacing.lg + 13,
        right: spacing.lg + 13,
        top: spacing.md + 13,
        height: 2,
        backgroundColor: colors.border,
    },
    progressLineFill: { height: 2, backgroundColor: colors.success },
    scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
    stepContent: { gap: spacing.md },
    stepTitle: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.navy },
    stepSubtitle: { fontSize: fontSize.base, color: colors.textSecondary },
    errorText: { fontSize: fontSize.xs, color: colors.danger },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    categoryCard: {
        width: '31%',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        alignItems: 'center',
        gap: spacing.xs,
    },
    categoryCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
    categoryLabel: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center' },
    categoryLabelActive: { color: colors.primary, fontWeight: fontWeight.medium },
    field: { gap: spacing.xs },
    label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
    input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        height: 48,
        fontSize: fontSize.base,
        color: colors.text,
    },
    inputError: { borderColor: colors.danger },
    textArea: { height: 120, paddingTop: spacing.sm },
    charCount: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'right' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: fontSize.sm, color: colors.textSecondary },
    chipTextActive: { color: colors.white, fontWeight: fontWeight.medium },
    row: { flexDirection: 'row', gap: spacing.md },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
    switchLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    switchHint: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2, marginLeft: 28 },
    imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    imageThumb: { width: 100, height: 100, borderRadius: borderRadius.md, overflow: 'hidden', position: 'relative' },
    imageThumbImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    imageRemove: { position: 'absolute', top: 2, right: 2 },
    mainImageBadge: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingVertical: 2,
    },
    mainImageText: { fontSize: 9, color: colors.white, textAlign: 'center', fontWeight: fontWeight.medium },
    addImageButtons: { flexDirection: 'row', gap: spacing.sm },
    addImageBtn: {
        width: 100,
        height: 100,
        borderRadius: borderRadius.md,
        borderWidth: 2,
        borderColor: colors.primaryLight,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        gap: spacing.xs,
    },
    addImageText: { fontSize: fontSize.xs, color: colors.primary },
    previewCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    previewImage: { width: '100%', height: 200, resizeMode: 'cover' },
    previewBody: { padding: spacing.md, gap: spacing.xs },
    previewPrice: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.navy },
    previewTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text },
    previewMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    previewMetaText: { fontSize: fontSize.sm, color: colors.textMuted },
    previewTreuhand: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.successLight,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
        alignSelf: 'flex-start',
    },
    previewTreuhandText: { fontSize: fontSize.sm, color: colors.success, fontWeight: fontWeight.medium },
    previewDesc: { fontSize: fontSize.base, color: colors.text, lineHeight: 20, marginTop: spacing.xs },
    previewImageCount: { fontSize: fontSize.xs, color: colors.textMuted },
    bottomBar: {
        flexDirection: 'row',
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: spacing.md,
    },
    backButton: {
        flex: 1,
        height: 50,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButtonText: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.textSecondary },
    nextButton: {
        flex: 2,
        height: 50,
        borderRadius: borderRadius.md,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nextButtonDisabled: { opacity: 0.7 },
    nextButtonText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.white },
});
