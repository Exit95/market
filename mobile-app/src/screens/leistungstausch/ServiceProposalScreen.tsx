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

type Props = NativeStackScreenProps<any, 'ServiceProposal'>;

const EFFORT_OPTIONS = [
    { id: 'UNTER_1_STUNDE', name: '< 1 Stunde' },
    { id: 'EIN_BIS_DREI_STUNDEN', name: '1–3 Stunden' },
    { id: 'DREI_BIS_ACHT_STUNDEN', name: '3–8 Stunden' },
    { id: 'MEHRERE_TAGE', name: 'Mehrere Tage' },
    { id: 'FORTLAUFEND', name: 'Fortlaufend' },
];

const LOCATION_OPTIONS = [
    { id: 'VOR_ORT', name: 'Vor Ort' },
    { id: 'REMOTE', name: 'Remote' },
    { id: 'BEIDES', name: 'Beides' },
];

export default function ServiceProposalScreen({ navigation, route }: Props) {
    const { listingId, listingTitle, soughtCategories } = route.params as {
        listingId: string;
        listingTitle: string;
        soughtCategories: Array<{ id: string; slug: string; name: string }>;
    };

    const [categories, setCategories] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Form fields
    const [offeredDescription, setOfferedDescription] = useState('');
    const [offeredCategory, setOfferedCategory] = useState('');
    const [offeredEffort, setOfferedEffort] = useState('');
    const [soughtDescription, setSoughtDescription] = useState(listingTitle ?? '');
    const [soughtEffort, setSoughtEffort] = useState('');
    const [locationType, setLocationType] = useState('');
    const [proposedTimeframe, setProposedTimeframe] = useState('');
    const [proposedLocation, setProposedLocation] = useState('');
    const [personalMessage, setPersonalMessage] = useState('');

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

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!offeredDescription.trim()) e.offeredDescription = 'Beschreibe was du anbietest';
        if (!offeredCategory) e.offeredCategory = 'Bitte wähle eine Kategorie';
        if (!offeredEffort) e.offeredEffort = 'Bitte wähle den Aufwand';
        if (!soughtEffort) e.soughtEffort = 'Bitte wähle den gewünschten Aufwand';
        if (!locationType) e.locationType = 'Bitte wähle den Ort';
        if (!proposedTimeframe.trim()) e.proposedTimeframe = 'Zeitrahmen ist erforderlich';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);
        try {
            const cookie = await AsyncStorage.getItem('session_cookie');
            const body = {
                listingId,
                offeredDescription,
                offeredCategorySlug: offeredCategory,
                offeredEffort,
                soughtDescription,
                soughtEffort,
                locationType,
                proposedTimeframe,
                proposedLocation: proposedLocation.trim() || undefined,
                personalMessage: personalMessage.trim() || undefined,
            };
            const res = await fetch(`${API_BASE}/api/leistungstausch/proposals`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(cookie ? { Cookie: cookie } : {}),
                },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                Alert.alert('Erfolg', 'Dein Vorschlag wurde gesendet!', [
                    { text: 'OK', onPress: () => navigation.goBack() },
                ]);
            } else {
                const data = await res.json().catch(() => ({}));
                Alert.alert('Fehler', data.error ?? 'Vorschlag konnte nicht gesendet werden.');
            }
        } catch {
            Alert.alert('Fehler', 'Verbindungsfehler. Bitte versuche es erneut.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.topBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.white} />
                </TouchableOpacity>
                <Text style={s.topTitle}>Vorschlag senden</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Listing context banner */}
            <View style={s.contextBanner}>
                <Ionicons name="swap-vertical" size={18} color={colors.teal} />
                <Text style={s.contextText} numberOfLines={1}>Für: {listingTitle}</Text>
            </View>

            <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
                {/* Sought categories hint */}
                {soughtCategories && soughtCategories.length > 0 && (
                    <View style={s.hintBox}>
                        <Text style={s.hintLabel}>Gesuchte Kategorien:</Text>
                        <View style={s.hintBadgeRow}>
                            {soughtCategories.map((sc) => (
                                <View key={sc.id ?? sc.slug} style={s.hintBadge}>
                                    <Text style={s.hintBadgeText}>{sc.name}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Offered description */}
                <View style={s.field}>
                    <Text style={s.label}>Was bietest du an?</Text>
                    <TextInput
                        style={[s.input, s.textArea, errors.offeredDescription && s.inputError]}
                        placeholder="Beschreibe deine angebotene Leistung..."
                        placeholderTextColor={colors.textMuted}
                        value={offeredDescription}
                        onChangeText={(t) => { setOfferedDescription(t); setErrors((e) => ({ ...e, offeredDescription: '' })); }}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        maxLength={1000}
                    />
                    {errors.offeredDescription ? <Text style={s.errorText}>{errors.offeredDescription}</Text> : null}
                </View>

                {/* Offered category */}
                <View style={s.field}>
                    <Text style={s.label}>Kategorie deiner Leistung</Text>
                    {errors.offeredCategory ? <Text style={s.errorText}>{errors.offeredCategory}</Text> : null}
                    <View style={s.chipRow}>
                        {categories.map((c) => (
                            <TouchableOpacity
                                key={c.slug}
                                style={[s.chip, offeredCategory === c.slug && s.chipActive]}
                                onPress={() => { setOfferedCategory(c.slug); setErrors((e) => ({ ...e, offeredCategory: '' })); }}
                            >
                                <Text style={[s.chipText, offeredCategory === c.slug && s.chipTextActive]}>{c.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Offered effort */}
                <View style={s.field}>
                    <Text style={s.label}>Aufwand deiner Leistung</Text>
                    {errors.offeredEffort ? <Text style={s.errorText}>{errors.offeredEffort}</Text> : null}
                    <View style={s.chipRow}>
                        {EFFORT_OPTIONS.map((o) => (
                            <TouchableOpacity
                                key={o.id}
                                style={[s.chip, offeredEffort === o.id && s.chipActive]}
                                onPress={() => { setOfferedEffort(o.id); setErrors((e) => ({ ...e, offeredEffort: '' })); }}
                            >
                                <Text style={[s.chipText, offeredEffort === o.id && s.chipTextActive]}>{o.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Sought description */}
                <View style={s.field}>
                    <Text style={s.label}>Was erwartest du als Gegenleistung?</Text>
                    <TextInput
                        style={[s.input, s.textArea]}
                        placeholder="Beschreibe die gewünschte Gegenleistung..."
                        placeholderTextColor={colors.textMuted}
                        value={soughtDescription}
                        onChangeText={setSoughtDescription}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        maxLength={1000}
                    />
                </View>

                {/* Sought effort */}
                <View style={s.field}>
                    <Text style={s.label}>Gewünschter Aufwand der Gegenleistung</Text>
                    {errors.soughtEffort ? <Text style={s.errorText}>{errors.soughtEffort}</Text> : null}
                    <View style={s.chipRow}>
                        {EFFORT_OPTIONS.map((o) => (
                            <TouchableOpacity
                                key={o.id}
                                style={[s.chip, soughtEffort === o.id && s.chipActive]}
                                onPress={() => { setSoughtEffort(o.id); setErrors((e) => ({ ...e, soughtEffort: '' })); }}
                            >
                                <Text style={[s.chipText, soughtEffort === o.id && s.chipTextActive]}>{o.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Location type */}
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

                {/* Proposed timeframe */}
                <View style={s.field}>
                    <Text style={s.label}>Vorgeschlagener Zeitrahmen</Text>
                    <TextInput
                        style={[s.input, errors.proposedTimeframe && s.inputError]}
                        placeholder="z.B. Nächste Woche, innerhalb 14 Tagen"
                        placeholderTextColor={colors.textMuted}
                        value={proposedTimeframe}
                        onChangeText={(t) => { setProposedTimeframe(t); setErrors((e) => ({ ...e, proposedTimeframe: '' })); }}
                        maxLength={200}
                    />
                    {errors.proposedTimeframe ? <Text style={s.errorText}>{errors.proposedTimeframe}</Text> : null}
                </View>

                {/* Proposed location */}
                <View style={s.field}>
                    <Text style={s.label}>Vorgeschlagener Ort (optional)</Text>
                    <TextInput
                        style={s.input}
                        placeholder="z.B. Berlin Mitte, Remote via Zoom"
                        placeholderTextColor={colors.textMuted}
                        value={proposedLocation}
                        onChangeText={setProposedLocation}
                        maxLength={200}
                    />
                </View>

                {/* Personal message */}
                <View style={s.field}>
                    <Text style={s.label}>Persönliche Nachricht (optional)</Text>
                    <TextInput
                        style={[s.input, s.textArea]}
                        placeholder="Schreibe eine persönliche Nachricht..."
                        placeholderTextColor={colors.textMuted}
                        value={personalMessage}
                        onChangeText={setPersonalMessage}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        maxLength={1000}
                    />
                </View>
            </ScrollView>

            {/* Submit */}
            <View style={s.bottomBar}>
                <TouchableOpacity
                    style={[s.submitButton, submitting && s.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                    activeOpacity={0.8}
                >
                    {submitting ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <>
                            <Ionicons name="send-outline" size={20} color={colors.white} />
                            <Text style={s.submitButtonText}>Vorschlag senden</Text>
                        </>
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
    contextBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.teal50,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.tealLight,
    },
    contextText: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.teal800 },
    scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
    hintBox: {
        backgroundColor: colors.teal50,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.tealLight,
    },
    hintLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.teal },
    hintBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    hintBadge: {
        backgroundColor: colors.tealLight,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: borderRadius.full,
    },
    hintBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.teal800 },
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
    textArea: { height: 100, paddingTop: spacing.sm },
    errorText: { fontSize: fontSize.xs, color: colors.danger },
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
    bottomBar: {
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    submitButton: {
        flexDirection: 'row',
        height: 50,
        borderRadius: borderRadius.md,
        backgroundColor: colors.teal,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    submitButtonDisabled: { opacity: 0.7 },
    submitButtonText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.white },
});
