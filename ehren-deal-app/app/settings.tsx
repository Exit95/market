import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ChevronRight,
  Shield,
  Bell,
  Lock,
  HelpCircle,
  FileText,
  LogOut,
  UserX,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react-native';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/store/auth-store';
import { useThemeStore } from '@/store/theme-store';
import { colors, spacing } from '@/theme';

interface SettingsItem {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { profile } = useAuthStore();
  const { colorScheme, setColorScheme } = useThemeStore();

  function handleLogout() {
    Alert.alert('Abmelden', 'Moechtest du dich wirklich abmelden?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Abmelden',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  }

  const sections: { title: string; items: SettingsItem[] }[] = [
    {
      title: 'Konto',
      items: [
        {
          icon: <Shield size={20} color={colors.neutral[600]} />,
          label: 'Verifizierung',
          onPress: () => {
            Alert.alert(
              'Verifizierung',
              'Die Verifizierung ist derzeit noch nicht verfuegbar. Wir arbeiten daran!'
            );
          },
        },
        {
          icon: <Bell size={20} color={colors.neutral[600]} />,
          label: 'Benachrichtigungen',
          onPress: () => router.push('/notifications'),
        },
        {
          icon: <Lock size={20} color={colors.neutral[600]} />,
          label: 'Passwort aendern',
          onPress: () => {
            Alert.alert(
              'Passwort aendern',
              'Diese Funktion wird in Kuerze verfuegbar sein.'
            );
          },
        },
        {
          icon: <UserX size={20} color={colors.neutral[600]} />,
          label: 'Blockierte Nutzer',
          onPress: () => {
            Alert.alert(
              'Blockierte Nutzer',
              'Du hast aktuell keine blockierten Nutzer.'
            );
          },
        },
      ],
    },
    {
      title: 'Darstellung',
      items: [
        {
          icon: <Sun size={20} color={colorScheme === 'light' ? colors.primary[500] : colors.neutral[600]} />,
          label: 'Hell',
          onPress: () => setColorScheme('light'),
        },
        {
          icon: <Moon size={20} color={colorScheme === 'dark' ? colors.primary[500] : colors.neutral[600]} />,
          label: 'Dunkel',
          onPress: () => setColorScheme('dark'),
        },
        {
          icon: <Monitor size={20} color={colorScheme === 'system' ? colors.primary[500] : colors.neutral[600]} />,
          label: 'System',
          onPress: () => setColorScheme('system'),
        },
      ],
    },
    {
      title: 'Rechtliches',
      items: [
        {
          icon: <FileText size={20} color={colors.neutral[600]} />,
          label: 'Datenschutz',
          onPress: () => {},
        },
        {
          icon: <FileText size={20} color={colors.neutral[600]} />,
          label: 'AGB',
          onPress: () => {},
        },
        {
          icon: <FileText size={20} color={colors.neutral[600]} />,
          label: 'Impressum',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: <HelpCircle size={20} color={colors.neutral[600]} />,
          label: 'Hilfe & FAQ',
          onPress: () => {},
        },
      ],
    },
    {
      title: '',
      items: [
        {
          icon: <LogOut size={20} color={colors.error[500]} />,
          label: 'Abmelden',
          onPress: handleLogout,
          destructive: true,
        },
      ],
    },
  ];

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
        <Text style={styles.headerTitle}>Einstellungen</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section, sIdx) => (
          <View key={sIdx} style={styles.section}>
            {section.title ? (
              <Text style={styles.sectionTitle}>{section.title}</Text>
            ) : null}
            <View style={styles.card}>
              {section.items.map((item, iIdx) => (
                <Pressable
                  key={iIdx}
                  onPress={item.onPress}
                  style={({ pressed }) => [
                    styles.row,
                    iIdx < section.items.length - 1 && styles.rowBorder,
                    pressed && { backgroundColor: colors.neutral[50] },
                  ]}
                >
                  {item.icon}
                  <Text
                    style={[
                      styles.rowLabel,
                      item.destructive && { color: colors.error[500] },
                    ]}
                  >
                    {item.label}
                  </Text>
                  <ChevronRight size={18} color={colors.neutral[300]} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.version}>Ehren-Deal v1.0.0</Text>
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
    backgroundColor: colors.background,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1, fontSize: 17, fontWeight: '600',
    color: colors.neutral[900], textAlign: 'center',
  },
  scroll: { paddingBottom: 40 },
  section: { marginTop: spacing.lg },
  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: colors.neutral[500],
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: spacing.md, marginBottom: 8,
  },
  card: {
    backgroundColor: colors.surface, marginHorizontal: spacing.md,
    borderRadius: 12,
    shadowColor: colors.black, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16, gap: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[100],
  },
  rowLabel: { flex: 1, fontSize: 15, color: colors.neutral[900] },
  version: {
    fontSize: 13, color: colors.neutral[400],
    textAlign: 'center', marginTop: 32,
  },
});
