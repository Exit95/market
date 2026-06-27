import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';
import { post } from '../../api/client';

type Props = NativeStackScreenProps<any, 'Register'>;

const STEPS = ['Name', 'Kontakt', 'Passwort'] as const;

export default function RegisterScreen({ navigation }: Props) {
    const [step, setStep] = useState(0);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [agbAccepted, setAgbAccepted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateStep = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (step === 0) {
            if (!firstName.trim()) newErrors.firstName = 'Vorname ist erforderlich';
            if (!lastName.trim()) newErrors.lastName = 'Nachname ist erforderlich';
        } else if (step === 1) {
            if (!email.trim()) newErrors.email = 'E-Mail ist erforderlich';
            else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Ungültige E-Mail-Adresse';
        } else if (step === 2) {
            if (!password) newErrors.password = 'Passwort ist erforderlich';
            else if (password.length < 8) newErrors.password = 'Mindestens 8 Zeichen';
            if (password !== confirmPassword) newErrors.confirmPassword = 'Passwörter stimmen nicht überein';
            if (!agbAccepted) newErrors.agb = 'Bitte akzeptiere die AGB';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (!validateStep()) return;
        if (step < STEPS.length - 1) {
            setStep(step + 1);
        } else {
            handleRegister();
        }
    };

    const handleBack = () => {
        if (step > 0) setStep(step - 1);
        else navigation.goBack();
    };

    const handleRegister = async () => {
        setLoading(true);
        try {
            const res = await post('/api/auth/register', {
                firstName,
                lastName,
                email,
                phone: phone || undefined,
                password,
            });
            if (res.ok) {
                Alert.alert(
                    'Registrierung erfolgreich',
                    'Bitte bestätige deine E-Mail-Adresse über den Link in der Bestätigungsmail.',
                    [{ text: 'OK', onPress: () => navigation.navigate('Login') }],
                );
            } else {
                Alert.alert('Fehler', 'Registrierung fehlgeschlagen. Vielleicht existiert bereits ein Konto mit dieser E-Mail.');
            }
        } catch {
            Alert.alert('Fehler', 'Verbindungsfehler. Bitte versuche es erneut.');
        } finally {
            setLoading(false);
        }
    };

    const renderProgressBar = () => (
        <View style={styles.progress}>
            {STEPS.map((label, i) => (
                <View key={label} style={styles.progressStep}>
                    <View style={[
                        styles.progressDot,
                        i <= step && styles.progressDotActive,
                        i < step && styles.progressDotDone,
                    ]}>
                        {i < step ? (
                            <Ionicons name="checkmark" size={14} color={colors.white} />
                        ) : (
                            <Text style={[styles.progressDotText, i <= step && styles.progressDotTextActive]}>
                                {i + 1}
                            </Text>
                        )}
                    </View>
                    <Text style={[styles.progressLabel, i <= step && styles.progressLabelActive]}>
                        {label}
                    </Text>
                    {i < STEPS.length - 1 && (
                        <View style={[styles.progressLine, i < step && styles.progressLineActive]} />
                    )}
                </View>
            ))}
        </View>
    );

    const renderField = (
        label: string,
        value: string,
        setter: (v: string) => void,
        key: string,
        opts?: { placeholder?: string; keyboardType?: any; secureTextEntry?: boolean; autoCapitalize?: any },
    ) => (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.inputWrapper, errors[key] && styles.inputError]}>
                <TextInput
                    style={styles.input}
                    placeholder={opts?.placeholder}
                    placeholderTextColor={colors.textMuted}
                    value={value}
                    onChangeText={(t) => { setter(t); setErrors((e) => ({ ...e, [key]: '' })); }}
                    keyboardType={opts?.keyboardType}
                    secureTextEntry={opts?.secureTextEntry}
                    autoCapitalize={opts?.autoCapitalize ?? 'none'}
                />
            </View>
            {errors[key] ? <Text style={styles.errorText}>{errors[key]}</Text> : null}
        </View>
    );

    const renderStepContent = () => {
        switch (step) {
            case 0:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Wie heißt du?</Text>
                        <Text style={styles.stepSubtitle}>Dein Name wird anderen Nutzern angezeigt.</Text>
                        {renderField('Vorname', firstName, setFirstName, 'firstName', { placeholder: 'Max', autoCapitalize: 'words' })}
                        {renderField('Nachname', lastName, setLastName, 'lastName', { placeholder: 'Mustermann', autoCapitalize: 'words' })}
                    </View>
                );
            case 1:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Kontaktdaten</Text>
                        <Text style={styles.stepSubtitle}>Wir senden dir eine Bestätigungsmail.</Text>
                        {renderField('E-Mail', email, setEmail, 'email', { placeholder: 'deine@email.de', keyboardType: 'email-address' })}
                        {renderField('Telefonnummer (optional)', phone, setPhone, 'phone', { placeholder: '+49 170 1234567', keyboardType: 'phone-pad' })}
                    </View>
                );
            case 2:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Passwort festlegen</Text>
                        <Text style={styles.stepSubtitle}>Wähle ein sicheres Passwort mit mindestens 8 Zeichen.</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Passwort</Text>
                            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Mindestens 8 Zeichen"
                                    placeholderTextColor={colors.textMuted}
                                    value={password}
                                    onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: '' })); }}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                                </TouchableOpacity>
                            </View>
                            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                        </View>
                        {renderField('Passwort bestätigen', confirmPassword, setConfirmPassword, 'confirmPassword', { secureTextEntry: true, placeholder: 'Passwort wiederholen' })}

                        <TouchableOpacity
                            style={styles.agbRow}
                            onPress={() => { setAgbAccepted(!agbAccepted); setErrors((e) => ({ ...e, agb: '' })); }}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={agbAccepted ? 'checkbox' : 'square-outline'}
                                size={22}
                                color={agbAccepted ? colors.primary : colors.textMuted}
                            />
                            <Text style={styles.agbText}>
                                Ich akzeptiere die <Text style={styles.agbLink}>AGB</Text> und{' '}
                                <Text style={styles.agbLink}>Datenschutzerklärung</Text>
                            </Text>
                        </TouchableOpacity>
                        {errors.agb ? <Text style={styles.errorText}>{errors.agb}</Text> : null}
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.navy} />
                    </TouchableOpacity>
                    <Text style={styles.topTitle}>Registrieren</Text>
                    <View style={{ width: 40 }} />
                </View>

                {renderProgressBar()}

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {renderStepContent()}
                </ScrollView>

                <View style={styles.bottomBar}>
                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleNext}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.white} />
                        ) : (
                            <Text style={styles.buttonText}>
                                {step === STEPS.length - 1 ? 'Konto erstellen' : 'Weiter'}
                            </Text>
                        )}
                    </TouchableOpacity>
                    {step === 0 && (
                        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
                            <Text style={styles.loginText}>
                                Bereits ein Konto? <Text style={styles.loginTextBold}>Anmelden</Text>
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
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
    backButton: { padding: spacing.xs },
    topTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.navy },
    progress: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xl,
        backgroundColor: colors.surface,
    },
    progressStep: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    progressDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressDotActive: { backgroundColor: colors.primary },
    progressDotDone: { backgroundColor: colors.success },
    progressDotText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted },
    progressDotTextActive: { color: colors.white },
    progressLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginLeft: spacing.xs },
    progressLabelActive: { color: colors.primary, fontWeight: fontWeight.medium },
    progressLine: {
        flex: 1,
        height: 2,
        backgroundColor: colors.border,
        marginHorizontal: spacing.xs,
    },
    progressLineActive: { backgroundColor: colors.success },
    scrollContent: {
        padding: spacing.lg,
        flexGrow: 1,
    },
    stepContent: { gap: spacing.md },
    stepTitle: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.navy },
    stepSubtitle: { fontSize: fontSize.base, color: colors.textSecondary, marginBottom: spacing.sm },
    inputGroup: { gap: spacing.xs },
    label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        height: 50,
    },
    inputError: { borderColor: colors.danger },
    input: { flex: 1, fontSize: fontSize.base, color: colors.text },
    eyeButton: { padding: spacing.xs },
    errorText: { fontSize: fontSize.xs, color: colors.danger },
    agbRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    agbText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
    agbLink: { color: colors.primary, fontWeight: fontWeight.medium },
    bottomBar: {
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: spacing.md,
    },
    button: {
        backgroundColor: colors.primary,
        height: 50,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.white },
    loginLink: { alignItems: 'center' },
    loginText: { fontSize: fontSize.base, color: colors.textSecondary },
    loginTextBold: { color: colors.primary, fontWeight: fontWeight.semibold },
});
