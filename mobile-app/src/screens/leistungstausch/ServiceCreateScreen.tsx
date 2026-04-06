import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../../theme';
import { spacing, borderRadius, fontSize, fontWeight } from '../../theme/spacing';

const API_BASE = 'https://ehren-deal.de';

type Props = NativeStackScreenProps<any, 'ServiceCreate'>;

const STEPS = ['Angebot', 'Suche', 'Vorschau'] as const;

const EFFORT_OPTIONS = [
    { id: 'UNTER_1_STUNDE', name: '< 1 Stunde' },
    { id: 'EIN_BIS_DREI_STUNDEN', name: '1–3 Stunden' },
    { id: 'DREI_BIS_ACHT_STUNDEN', name: '3–8 Stunden' },
    { id: 'MEHRERE_TAGE', name: 'Mehrere Tage' },
    { id: 'FORTLAUFEND', name: 'Fortlaufend' },
];

const EXPERIENCE_OPTIONS = [
    { id: 'EINSTEIGER', name: 'Einsteiger' },
    { id: 'FORTGESCHRITTEN', name: 'Fortgeschritten' },
    { id: 'EXPERTE', name: 'Experte' },
    { id: 'PROFI', name: 'Profi' },
];

const LOCATION_OPTIONS = [
    { id: 'VOR_ORT', name: 'Vor Ort' },
    { id: 'REMOTE', name: 'Remote' },
    { id: 'BEIDES', name: 'Beides' },
];

const AVAILABILITY_OPTIONS = [
    { id: 'MORGENS', name: 'Morgens' },
    { id: 'MITTAGS', name: 'Mittags' },
    { id: 'NACHMITTAGS', name: 'Nachmittags' },
    { id: 'ABENDS', name: 'Abends' },
    { id: 'WOCHENENDE', name: 'Wochenende' },
    { id: 'FLEXIBEL', name: 'Flexibel' },
];

export default function ServiceCreateScreen({ navigation }: Props) {
    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Step 1
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [effort, setEffort] = useState('');
    const [experienceLevel, setExperienceLevel] = useState('');

    // Step 2
    const [soughtCategories, setSoughtCategories] = useState<string[]>([]);
    const [soughtDescription, setSoughtDescription] = useState('');
    const [locationType, setLocationType] = useState('');
    const [city, setCity] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [availability, setAvailability] = useState<string[]>([]);
    const [requirements, setRequirements] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/api/leistungstausch/categories`);
                if (res.ok) {
                    const data = await res.json();
                    setCategories(data.categories ?? []);
                }
            } catch {}
        })();
    }, []);

    const validateStep = (): boolean => {
        const e: Record<string, string> = {};
        if (step === 0) {
            if (!title.trim()) e.title = 'Titel ist erforderlich';
            if (!category) e.category = 'Bitte wähle eine Kategorie';
            if (!description.trim()) e.description = 'Beschreibung ist erforderlich';
            if (!effort) e.effort = 'Bitte wähle den Aufwand';
            if (!experienceLevel) e.experienceLevel = 'Bitte wähle dein Erfahrungslevel';
        }
        if (step === 1) {
            if (soughtCategories.length === 0) e.soughtCategories = 'Mindestens eine gesuchte Kategorie';
            if (!soughtDescription.trim()) e.soughtDescription = 'Beschreibe was du suchst';
            if (!locationType) e.locationType = 'Bitte wähle den Ort';
            if (locationType !== 'REMOTE') {
                if (!city.trim()) e.city = 'Ort ist erforderlich';
                if (!postalCode.trim()) e.postalCode = 'PLZ ist erforderlich';
            }
            if (availability.length === 0) e.availability = 'Bitte wähle Verfügbarkeit';
        }
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

    const toggleSoughtCategory = (slug: string) => {
        if (soughtCategories.includes(slug)) {
            setSoughtCategories(soughtCategories.filter((s) => s !== slug));
        } else if (soughtCategories.length < 3) {
            setSoughtCategories([...soughtCategories, slug]);
        }
        setErrors((e) => ({ ...e, soughtCategories: '' }));
    };

    const toggleAvailability = (id: string) => {
        if (availability.includes(id)) {
            setAvailability(availability.filter((a) => a !== id));
        } else {
            setAvailability([...availability, id]);
        }
        setErrors((e) => ({ ...e, availability: '' }));
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const cookie = await AsyncStorage.getItem('session_cookie');
            const body = {
                title,
                offeredCategorySlug: category,
                description,
                effort,
                experienceLevel,
                soughtCategorySlugs: soughtCategories,
                soughtDescription,
                locationType,
                city: locationType !== 'REMOTE' ? city : undefined,
                postalCode: locationType !== 'REMOTE' ? postalCode : undefined,
                availability,
                requirements: requirements.trim() || undefined,
            };
            const res = await fetch(`${API_BASE}/api/leistungstausch/listings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(cookie ? { Cookie: cookie } : {}),
                },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                const data = await res.json();
                Alert.alert('Erfolg', 'Dein Leistungstausch-Angebot wurde erstellt!', [
                    {
                        text: 'Ansehen',
                        onPress: () => navigation.replace('ServiceDetail', { id: data.listing?.id ?? data.id }),
                    },
                ]);
            } else {
                Alert.alert('Fehler', 'Angebot konnte nicht erstellt werden.');
            }
        } catch {
            Alert.alert('Fehler', 'Verbindungsfehler. Bitte versuche es erneut.');
        } finally {
            setSubmitting(false);
        }
    };

    const getCategoryName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;

    const renderProgress = () => (
        <View style={s.progressBar}>
            {STEPS.map((label, i) => (
                <View key={label} style={s.progressItem}>
                    <View style={[s.progressDot, i <= step && s.progressDotActive, i < step && s.progressDotDone]}>
                        {i < step ? (
                            <Ionicons name="checkmark" size={12} color={colors.white} />
                        ) : (
                            <Text style={[s.progressNum, i <= step && s.progressNumActive]}>{i + 1}</Text>
                        )}
                    </View>
                    <Text style={[s.progressLabel, i <= step && s.progressLabelActive]} numberOfLines={1}>
                        {label}
                    </Text>
                </View>
            ))}
            <View style={s.progressLineContainer}>
                <View style={[s.progressLineFill, { width: `${(step / (STEPS.length - 1)) * 100}%` }]} />
            </View>
        </View>
    );

    const renderStep1 = () => (
        <View style={s.stepContent}>
            <Text style={s.stepTitle}>Was bietest du an?</Text>
            <Text style={s.stepSubtitle}>Beschreibe deine Dienstleistung</Text>

            <View style={s.field}>
                <Text style={s.label}>Titel</Text>
                <TextInput
                    style={[s.input, errors.title && s.inputError]}
                    placeholder="z.B. Webseiten-Erstellung"
                    placeholderTextColor={colors.textMuted}
                    value={title}
                    onChangeText={(t) => { setTitle(t); setErrors((e) => ({ ...e, title: '' })); }}
                    maxLength={100}
                />
                {errors.title ? <Text style={s.errorText}>{errors.title}</Text> : null}
                <Text style={s.charCount}>{title.length}/100</Text>
            </View>

            <View style={s.field}>
                <Text style={s.label}>Kategorie</Text>
                {errors.category ? <Text style={s.errorText}>{errors.category}</Text> : null}
                <View style={s.chipRow}>
                    {categories.map((c) => (
                        <TouchableOpacity
                            key={c.slug}
                            style={[s.chip, category === c.slug && s.chipActive]}
                            onPress={() => { setCategory(c.slug); setErrors((e) => ({ ...e, category: '' })); }}
                        >
                            <Text style={[s.chipText, category === c.slug && s.chipTextActive]}>{c.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={s.field}>
                <Text style={s.label}>Beschreibung</Text>
                <TextInput
                    style={[s.input, s.textArea, errors.description && s.inputError]}
                    placeholder="Beschreibe deine Dienstleistung ausführlich..."
                    placeholderTextColor={colors.textMuted}
                    value={description}
                    onChangeText={(t) => { setDescription(t); setErrors((e) => ({ ...e, description: '' })); }}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    maxLength={2000}
                />
                {errors.description ? <Text style={s.errorText}>{errors.description}</Text> : null}
                <Text style={s.charCount}>{description.length}/2000</Text>
            </View>

            <View style={s.field}>
                <Text style={s.label}>Geschätzter Aufwand</Text>
                {errors.effort ? <Text style={s.errorText}>{errors.effort}</Text> : null}
                <View style={s.chipRow}>
                    {EFFORT_OPTIONS.map((o) => (
                        <TouchableOpacity
                            key={o.id}
                            style={[s.chip, effort === o.id && s.chipActive]}
                            onPress={() => { setEffort(o.id); setErrors((e) => ({ ...e, effort: '' })); }}
                        >
                            <Text style={[s.chipText, effort === o.id && s.chipTextActive]}>{o.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={s.field}>
                <Text style={s.label}>Erfahrungslevel</Text>
                {errors.experienceLevel ? <Text style={s.errorText}>{errors.experienceLevel}</Text> : null}
                <View style={s.chipRow}>
                    {EXPERIENCE_OPTIONS.map((o) => (
                        <TouchableOpacity
                            key={o.id}
                            style={[s.chip, experienceLevel === o.id && s.chipActive]}
                            onPress={() => { setExperienceLevel(o.id); setErrors((e) => ({ ...e, experienceLevel: '' })); }}
                        >
                            <Text style={[s.chipText, experienceLevel === o.id && s.chipTextActive]}>{o.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );

    const renderStep2 = () => (
        <View style={s.stepContent}>
            <Text style={s.stepTitle}>Was suchst du?</Text>
            <Text style={s.stepSubtitle}>Welche Gegenleistung wünschst du dir?</Text>

            <View style={s.field}>
                <Text style={s.label}>Gesuchte Kategorien (max. 3)</Text>
                {errors.soughtCategories ? <Text style={s.errorText}>{errors.soughtCategories}</Text> : null}
                <View style={s.chipRow}>
                    {categories.map((c) => (
                        <TouchableOpacity
                            key={c.slug}
                            style={[s.chip, soughtCategories.includes(c.slug) && s.chipActive]}
                            onPress={() => toggleSoughtCategory(c.slug)}
                        >
                            <Text style={[s.chipText, soughtCategories.includes(c.slug) && s.chipTextActive]}>{c.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={s.field}>
                <Text style={s.label}>Beschreibung der Gegenleistung</Text>
                <TextInput
                    style={[s.input, s.textArea, errors.soughtDescription && s.inputError]}
                    placeholder="Beschreibe was du im Tausch suchst..."
                    placeholderTextColor={colors.textMuted}
                    value={soughtDescription}
                    onChangeText={(t) => { setSoughtDescription(t); setErrors((e) => ({ ...e, soughtDescription: '' })); }}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={1000}
                />
                {errors.soughtDescription ? <Text style={s.errorText}>{errors.soughtDescription}</Text> : null}
            </View>

            <View style={s.field}>
                <Text style={s.label}>Ort</Text>
                {errors.locationType ? <Text style={s.errorText}>{errors.locationType}</Text> : null}
                <View style={s.chipRow}>
                    {LOCATION_OPTIONS.map((o) => (
                        <TouchableOpacity
                            key={o.id}
                            style={[s.chip, locationType === o.id && s.chipActive]}
                            onPress={() => { setLocationType(o.id); setErrors((e) => ({ ...e, locationType: '' })); }}
                        >
                            <Text style={[s.chipText, locationType === o.id && s.chipTextActive]}>{o.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {locationType !== 'REMOTE' && locationType !== '' && (
                <View style={s.row}>
                    <View style={[s.field, { flex: 2 }]}>
                        <Text style={s.label}>Stadt</Text>
                        <TextInput
                            style={[s.input, errors.city && s.inputError]}
                            placeholder="Berlin"
                            placeholderTextColor={colors.textMuted}
                            value={city}
                            onChangeText={(t) => { setCity(t); setErrors((e) => ({ ...e, city: '' })); }}
                        />
                        {errors.city ? <Text style={s.errorText}>{errors.city}</Text> : null}
                    </View>
                    <View style={[s.field, { flex: 1 }]}>
                        <Text style={s.label}>PLZ</Text>
                        <TextInput
                            style={[s.input, errors.postalCode && s.inputError]}
                            placeholder="10115"
                            placeholderTextColor={colors.textMuted}
                            value={postalCode}
                            onChangeText={(t) => { setPostalCode(t); setErrors((e) => ({ ...e, postalCode: '' })); }}
                            keyboardType="numeric"
                            maxLength={5}
                        />
                        {errors.postalCode ? <Text style={s.errorText}>{errors.postalCode}</Text> : null}
                    </View>
                </View>
            )}

            <View style={s.field}>
                <Text style={s.label}>Verfügbarkeit</Text>
                {errors.availability ? <Text style={s.errorText}>{errors.availability}</Text> : null}
                <View style={s.chipRow}>
                    {AVAILABILITY_OPTIONS.map((o) => (
                        <TouchableOpacity
                            key={o.id}
                            style={[s.chip, availability.includes(o.id) && s.chipActive]}
                            onPress={() => toggleAvailability(o.id)}
                        >
                            <Text style={[s.chipText, availability.includes(o.id) && s.chipTextActive]}>{o.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={s.field}>
                <Text style={s.label}>Anforderungen (optional)</Text>
                <TextInput
                    style={[s.input, s.textArea]}
                    placeholder="Gibt es besondere Anforderungen?"
                    placeholderTextColor={colors.textMuted}
                    value={requirements}
                    onChangeText={setRequirements}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    maxLength={500}
                />
            </View>
        </View>
    );

    const renderStep3 = () => (
        <View style={s.stepContent}>
            <Text style={s.stepTitle}>Vorschau</Text>
            <Text style={s.stepSubtitle}>Prüfe dein Angebot bevor du es veröffentlichst.</Text>

            <View style={s.previewCard}>
                <View style={s.previewHeader}>
                    <Ionicons name="swap-vertical" size={24} color={colors.teal} />
                    <Text style={s.previewLabel}>Leistungstausch</Text>
                </View>
                <View style={s.previewBody}>
                    <View style={s.previewBadge}>
                        <Text style={s.previewBadgeText}>{getCategoryName(category)}</Text>
                    </View>
                    <Text style={s.previewTitle}>{title}</Text>
                    {description.length > 0 && (
                        <Text style={s.previewDesc} numberOfLines={3}>{description}</Text>
                    )}

                    <View style={s.previewDivider} />

                    <Text style={s.previewSectionLabel}>Suche:</Text>
                    <View style={s.previewSoughtRow}>
                        {soughtCategories.map((slug) => (
                            <View key={slug} style={s.previewSoughtBadge}>
                                <Text style={s.previewSoughtText}>{getCategoryName(slug)}</Text>
                            </View>
                        ))}
                    </View>
                    {soughtDescription.length > 0 && (
                        <Text style={s.previewDesc} numberOfLines={2}>{soughtDescription}</Text>
                    )}

                    <View style={s.previewDivider} />

                    <View style={s.previewMetaRow}>
                        <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                        <Text style={s.previewMetaText}>{EFFORT_OPTIONS.find((o) => o.id === effort)?.name}</Text>
                    </View>
                    <View style={s.previewMetaRow}>
                        <Ionicons name="bar-chart-outline" size={14} color={colors.textMuted} />
                        <Text style={s.previewMetaText}>{EXPERIENCE_OPTIONS.find((o) => o.id === experienceLevel)?.name}</Text>
                    </View>
                    <View style={s.previewMetaRow}>
                        <Ionicons name={locationType === 'REMOTE' ? 'desktop-outline' : 'location-outline'} size={14} color={colors.textMuted} />
                        <Text style={s.previewMetaText}>
                            {LOCATION_OPTIONS.find((o) => o.id === locationType)?.name}
                            {locationType !== 'REMOTE' && city ? ` — ${postalCode} ${city}` : ''}
                        </Text>
                    </View>
                    <View style={s.previewMetaRow}>
                        <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                        <Text style={s.previewMetaText}>
                            {availability.map((a) => AVAILABILITY_OPTIONS.find((o) => o.id === a)?.name).join(', ')}
                        </Text>
                    </View>
                    {requirements.trim() ? (
                        <View style={s.previewMetaRow}>
                            <Ionicons name="clipboard-outline" size={14} color={colors.textMuted} />
                            <Text style={s.previewMetaText}>{requirements}</Text>
                        </View>
                    ) : null}
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.topBar}>
                <TouchableOpacity onPress={handleBack} style={s.topBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.white} />
                </TouchableOpacity>
                <Text style={s.topTitle}>Angebot erstellen</Text>
                <View style={{ width: 40 }} />
            </View>

            {renderProgress()}

            <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
                {step === 0 && renderStep1()}
                {step === 1 && renderStep2()}
                {step === 2 && renderStep3()}
            </ScrollView>

            <View style={s.bottomBar}>
                {step > 0 && (
                    <TouchableOpacity style={s.backButton} onPress={handleBack}>
                        <Text style={s.backButtonText}>Zurück</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[s.nextButton, submitting && s.nextButtonDisabled, step === 0 && { flex: 1 }]}
                    onPress={handleNext}
                    disabled={submitting}
                    activeOpacity={0.8}
                >
                    {submitting ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <Text style={s.nextButtonText}>
                            {step === STEPS.length - 1 ? 'Angebot veröffentlichen' : 'Weiter'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.tealDark,
    },
    topBtn: { padding: spacing.xs },
    topTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.white },
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
    progressDotActive: { backgroundColor: colors.teal },
    progressDotDone: { backgroundColor: colors.success },
    progressNum: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted },
    progressNumActive: { color: colors.white },
    progressLabel: { fontSize: 10, color: colors.textMuted, marginTop: 3 },
    progressLabelActive: { color: colors.teal, fontWeight: fontWeight.medium },
    progressLineContainer: {
        position: 'absolute',
        left: spacing.lg + 13,
        right: spacing.lg + 13,
        top: spacing.md + 13,
        height: 2,
        backgroundColor: colors.border,
    },
    progressLineFill: { height: 2, backgroundColor: colors.teal },
    scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
    stepContent: { gap: spacing.md },
    stepTitle: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.navy },
    stepSubtitle: { fontSize: fontSize.base, color: colors.textSecondary },
    errorText: { fontSize: fontSize.xs, color: colors.danger },
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
    chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
    chipText: { fontSize: fontSize.sm, color: colors.textSecondary },
    chipTextActive: { color: colors.white, fontWeight: fontWeight.medium },
    row: { flexDirection: 'row', gap: spacing.md },
    previewCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.teal50,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    previewLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.teal },
    previewBody: { padding: spacing.md, gap: spacing.sm },
    previewBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.tealLight,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: borderRadius.full,
    },
    previewBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.teal800 },
    previewTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text },
    previewDesc: { fontSize: fontSize.base, color: colors.text, lineHeight: 20 },
    previewDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
    previewSectionLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.teal },
    previewSoughtRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    previewSoughtBadge: {
        backgroundColor: colors.teal50,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
    },
    previewSoughtText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.teal700 },
    previewMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    previewMetaText: { fontSize: fontSize.sm, color: colors.textMuted },
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
        backgroundColor: colors.teal,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nextButtonDisabled: { opacity: 0.7 },
    nextButtonText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.white },
});
