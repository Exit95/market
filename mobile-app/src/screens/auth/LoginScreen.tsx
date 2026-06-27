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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';
import { post, saveSessionCookie } from '../../api/client';

type Props = NativeStackScreenProps<any, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    const validate = (): boolean => {
        const newErrors: typeof errors = {};
        if (!email.trim()) newErrors.email = 'E-Mail ist erforderlich';
        else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Ungültige E-Mail-Adresse';
        if (!password) newErrors.password = 'Passwort ist erforderlich';
        else if (password.length < 8) newErrors.password = 'Mindestens 8 Zeichen';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            const res = await post<{ user: any }>('/api/auth/login', { email, password });
            if (res.ok) {
                navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
            } else {
                Alert.alert('Fehler', 'E-Mail oder Passwort ist falsch.');
            }
        } catch {
            Alert.alert('Fehler', 'Verbindungsfehler. Bitte versuche es erneut.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.header}>
                    <Ionicons name="shield-checkmark" size={48} color={colors.primary} />
                    <Text style={styles.logo}>Ehren-Deal</Text>
                    <Text style={styles.subtitle}>Sicher handeln mit Vertrauen</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>E-Mail</Text>
                        <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                            <Ionicons name="mail-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="deine@email.de"
                                placeholderTextColor={colors.textMuted}
                                value={email}
                                onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: undefined })); }}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Passwort</Text>
                        <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                            <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Mindestens 8 Zeichen"
                                placeholderTextColor={colors.textMuted}
                                value={password}
                                onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: undefined })); }}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>
                        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                    </View>

                    <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                        <Text style={styles.forgotText}>Passwort vergessen?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.white} />
                        ) : (
                            <Text style={styles.buttonText}>Anmelden</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.registerLink}
                        onPress={() => navigation.navigate('Register')}
                    >
                        <Text style={styles.registerText}>
                            Noch kein Konto?{' '}
                            <Text style={styles.registerTextBold}>Jetzt registrieren</Text>
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.trustBanner}>
                        <Ionicons name="shield-checkmark" size={16} color={colors.success} />
                        <Text style={styles.trustText}>
                            Deine Daten sind bei uns sicher. Verschlüsselte Übertragung via SSL.
                        </Text>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: colors.background,
    },
    container: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    logo: {
        fontSize: fontSize['3xl'],
        fontWeight: fontWeight.bold,
        color: colors.navy,
        marginTop: spacing.sm,
    },
    subtitle: {
        fontSize: fontSize.base,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    form: {
        gap: spacing.md,
    },
    inputGroup: {
        gap: spacing.xs,
    },
    label: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.text,
    },
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
    inputError: {
        borderColor: colors.danger,
    },
    inputIcon: {
        marginRight: spacing.sm,
    },
    input: {
        flex: 1,
        fontSize: fontSize.base,
        color: colors.text,
    },
    eyeButton: {
        padding: spacing.xs,
    },
    errorText: {
        fontSize: fontSize.xs,
        color: colors.danger,
    },
    forgotText: {
        fontSize: fontSize.sm,
        color: colors.primary,
        textAlign: 'right',
    },
    button: {
        backgroundColor: colors.primary,
        height: 50,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.sm,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.semibold,
        color: colors.white,
    },
    footer: {
        marginTop: spacing.xl,
        alignItems: 'center',
        gap: spacing.lg,
    },
    registerLink: {
        padding: spacing.sm,
    },
    registerText: {
        fontSize: fontSize.base,
        color: colors.textSecondary,
    },
    registerTextBold: {
        color: colors.primary,
        fontWeight: fontWeight.semibold,
    },
    trustBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.successLight,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        gap: spacing.sm,
    },
    trustText: {
        fontSize: fontSize.xs,
        color: colors.success,
        flex: 1,
    },
});
