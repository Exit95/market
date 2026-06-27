import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Alert,
    Switch,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';
import { get, post, patch, clearSession } from '../../api/client';
import type { User } from '../../types';

type Props = NativeStackScreenProps<any, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Profile form
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [city, setCity] = useState('');

    // Password form
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    // Notifications
    const [notifyMessages, setNotifyMessages] = useState(true);
    const [notifyDeals, setNotifyDeals] = useState(true);
    const [notifyMarketing, setNotifyMarketing] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await get<{ user: User }>('/api/auth/me');
                if (res.ok) {
                    const u = res.data.user;
                    setUser(u);
                    setFirstName(u.firstName ?? '');
                    setLastName(u.lastName ?? '');
                    setCity(u.city ?? '');
                }
            } catch {
                // silently handle
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleSaveProfile = async () => {
        if (!firstName.trim()) {
            Alert.alert('Fehler', 'Vorname ist erforderlich.');
            return;
        }
        setSaving(true);
        try {
            const res = await patch('/api/profile', { firstName, lastName, city });
            if (res.ok) {
                Alert.alert('Gespeichert', 'Dein Profil wurde aktualisiert.');
            } else {
                Alert.alert('Fehler', 'Profil konnte nicht gespeichert werden.');
            }
        } catch {
            Alert.alert('Fehler', 'Verbindungsfehler.');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword) {
            Alert.alert('Fehler', 'Bitte gib dein aktuelles Passwort ein.');
            return;
        }
        if (newPassword.length < 8) {
            Alert.alert('Fehler', 'Das neue Passwort muss mindestens 8 Zeichen haben.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            Alert.alert('Fehler', 'Die Passwörter stimmen nicht überein.');
            return;
        }
        setSaving(true);
        try {
            const res = await post('/api/auth/change-password', {
                currentPassword,
                newPassword,
            });
            if (res.ok) {
                Alert.alert('Erfolg', 'Passwort wurde geändert.');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
                setShowPasswordSection(false);
            } else {
                Alert.alert('Fehler', 'Passwort konnte nicht geändert werden. Prüfe dein aktuelles Passwort.');
            }
        } catch {
            Alert.alert('Fehler', 'Verbindungsfehler.');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveNotifications = async () => {
        try {
            await post('/api/profile/notifications', {
                messages: notifyMessages,
                deals: notifyDeals,
                marketing: notifyMarketing,
            });
            Alert.alert('Gespeichert', 'Benachrichtigungseinstellungen aktualisiert.');
        } catch {
            Alert.alert('Fehler', 'Verbindungsfehler.');
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Abmelden',
            'Möchtest du dich wirklich abmelden?',
            [
                { text: 'Abbrechen', style: 'cancel' },
                {
                    text: 'Abmelden',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await post('/api/auth/logout');
                        } catch {
                            // silently continue
                        }
                        await clearSession();
                        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                    },
                },
            ],
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Konto löschen',
            'Bist du sicher? Diese Aktion kann nicht rückgängig gemacht werden. Alle deine Daten, Inserate und Deals werden dauerhaft gelöscht.',
            [
                { text: 'Abbrechen', style: 'cancel' },
                {
                    text: 'Konto löschen',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await post('/api/auth/delete-account');
                            if (res.ok) {
                                await clearSession();
                                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                            } else {
                                Alert.alert('Fehler', 'Konto konnte nicht gelöscht werden.');
                            }
                        } catch {
                            Alert.alert('Fehler', 'Verbindungsfehler.');
                        }
                    },
                },
            ],
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.navy} />
                </TouchableOpacity>
                <Text style={styles.topTitle}>Einstellungen</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                {/* Profile Edit */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Profil bearbeiten</Text>
                    <View style={styles.field}>
                        <Text style={styles.label}>Vorname</Text>
                        <TextInput
                            style={styles.input}
                            value={firstName}
                            onChangeText={setFirstName}
                            placeholder="Vorname"
                            placeholderTextColor={colors.textMuted}
                            autoCapitalize="words"
                        />
                    </View>
                    <View style={styles.field}>
                        <Text style={styles.label}>Nachname</Text>
                        <TextInput
                            style={styles.input}
                            value={lastName}
                            onChangeText={setLastName}
                            placeholder="Nachname"
                            placeholderTextColor={colors.textMuted}
                            autoCapitalize="words"
                        />
                    </View>
                    <View style={styles.field}>
                        <Text style={styles.label}>Ort</Text>
                        <TextInput
                            style={styles.input}
                            value={city}
                            onChangeText={setCity}
                            placeholder="z.B. Berlin"
                            placeholderTextColor={colors.textMuted}
                        />
                    </View>
                    <View style={styles.field}>
                        <Text style={styles.label}>E-Mail</Text>
                        <View style={styles.readOnlyField}>
                            <Text style={styles.readOnlyText}>{user?.email}</Text>
                            <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                        onPress={handleSaveProfile}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color={colors.white} />
                        ) : (
                            <Text style={styles.saveButtonText}>Profil speichern</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Change Password */}
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.sectionHeaderRow}
                        onPress={() => setShowPasswordSection(!showPasswordSection)}
                    >
                        <Text style={styles.sectionTitle}>Passwort ändern</Text>
                        <Ionicons
                            name={showPasswordSection ? 'chevron-up' : 'chevron-down'}
                            size={22}
                            color={colors.textMuted}
                        />
                    </TouchableOpacity>
                    {showPasswordSection && (
                        <View style={styles.passwordForm}>
                            <View style={styles.field}>
                                <Text style={styles.label}>Aktuelles Passwort</Text>
                                <TextInput
                                    style={styles.input}
                                    value={currentPassword}
                                    onChangeText={setCurrentPassword}
                                    secureTextEntry
                                    placeholder="Aktuelles Passwort"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>
                            <View style={styles.field}>
                                <Text style={styles.label}>Neues Passwort</Text>
                                <TextInput
                                    style={styles.input}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry
                                    placeholder="Mindestens 8 Zeichen"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>
                            <View style={styles.field}>
                                <Text style={styles.label}>Neues Passwort bestätigen</Text>
                                <TextInput
                                    style={styles.input}
                                    value={confirmNewPassword}
                                    onChangeText={setConfirmNewPassword}
                                    secureTextEntry
                                    placeholder="Passwort wiederholen"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                                onPress={handleChangePassword}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color={colors.white} />
                                ) : (
                                    <Text style={styles.saveButtonText}>Passwort ändern</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Notifications */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Benachrichtigungen</Text>
                    <View style={styles.switchRow}>
                        <View style={styles.switchInfo}>
                            <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
                            <Text style={styles.switchLabel}>Neue Nachrichten</Text>
                        </View>
                        <Switch
                            value={notifyMessages}
                            onValueChange={setNotifyMessages}
                            trackColor={{ true: colors.primary, false: colors.border }}
                            thumbColor={colors.white}
                        />
                    </View>
                    <View style={styles.switchRow}>
                        <View style={styles.switchInfo}>
                            <Ionicons name="cart-outline" size={20} color={colors.primary} />
                            <Text style={styles.switchLabel}>Deal-Updates</Text>
                        </View>
                        <Switch
                            value={notifyDeals}
                            onValueChange={setNotifyDeals}
                            trackColor={{ true: colors.primary, false: colors.border }}
                            thumbColor={colors.white}
                        />
                    </View>
                    <View style={styles.switchRow}>
                        <View style={styles.switchInfo}>
                            <Ionicons name="megaphone-outline" size={20} color={colors.primary} />
                            <Text style={styles.switchLabel}>Angebote und Neuigkeiten</Text>
                        </View>
                        <Switch
                            value={notifyMarketing}
                            onValueChange={setNotifyMarketing}
                            trackColor={{ true: colors.primary, false: colors.border }}
                            thumbColor={colors.white}
                        />
                    </View>
                    <TouchableOpacity style={styles.saveButtonOutline} onPress={handleSaveNotifications}>
                        <Text style={styles.saveButtonOutlineText}>Benachrichtigungen speichern</Text>
                    </TouchableOpacity>
                </View>

                {/* Danger Zone */}
                <View style={styles.dangerSection}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
                        <Ionicons name="log-out-outline" size={22} color={colors.danger} />
                        <Text style={styles.logoutText}>Abmelden</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount} activeOpacity={0.7}>
                        <Ionicons name="trash-outline" size={22} color={colors.danger} />
                        <Text style={styles.deleteText}>Konto löschen</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.version}>Ehren-Deal App v1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
    scrollContent: { paddingBottom: spacing.xxl },
    section: {
        backgroundColor: colors.surface,
        padding: spacing.lg,
        marginTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: spacing.md,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.semibold,
        color: colors.navy,
    },
    field: { gap: spacing.xs },
    label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
    input: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        height: 48,
        fontSize: fontSize.base,
        color: colors.text,
    },
    readOnlyField: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.borderLight,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        height: 48,
    },
    readOnlyText: { fontSize: fontSize.base, color: colors.textMuted },
    passwordForm: { gap: spacing.md },
    saveButton: {
        backgroundColor: colors.primary,
        height: 48,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonDisabled: { opacity: 0.7 },
    saveButtonText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.white },
    saveButtonOutline: {
        height: 48,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonOutlineText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.primary },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.xs,
    },
    switchInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
    switchLabel: { fontSize: fontSize.base, color: colors.text },
    dangerSection: {
        marginTop: spacing.lg,
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: colors.danger,
        gap: spacing.sm,
    },
    logoutText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.danger },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        borderRadius: borderRadius.md,
        backgroundColor: colors.dangerLight,
        gap: spacing.sm,
    },
    deleteText: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.danger },
    version: {
        fontSize: fontSize.xs,
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: spacing.xl,
        marginBottom: spacing.lg,
    },
});
