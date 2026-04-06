/**
 * Ehren-Deal Design System — Trust-First Theme
 * Identisch mit der Web-Plattform (tailwind.config.mjs)
 */
export const colors = {
    // Primary
    primary: '#1B65A6',
    primaryLight: '#E3F2FD',
    primaryDark: '#14507F',

    // Success (Safe Green)
    success: '#22A06B',
    successLight: '#E8F5E9',

    // Accent (Gold — nur für Elite/Premium)
    accent: '#D97706',
    accentLight: '#FEF3C7',

    // Danger
    danger: '#DC2626',
    dangerLight: '#FEE2E2',

    // Navy
    navy: '#1A2332',

    // Backgrounds
    background: '#F8FAFB',
    surface: '#FFFFFF',

    // Text
    text: '#1A2332',
    textSecondary: '#64748B',
    textMuted: '#6B7280',

    // Borders
    border: '#E5E7EB',
    borderLight: '#F1F5F9',

    // Teal (Leistungstausch)
    teal: '#0D9488',
    tealLight: '#CCFBF1',
    tealDark: '#0F766E',
    teal50: '#F0FDFA',
    teal100: '#CCFBF1',
    teal700: '#0F766E',
    teal800: '#115E59',

    // Transparent
    transparent: 'transparent',
    white: '#FFFFFF',
    black: '#000000',
} as const;

export const statusColors = {
    PENDING: colors.textMuted,
    PAYMENT_PENDING: colors.accent,
    PAID: colors.primary,
    SHIPPED: colors.primary,
    DELIVERED: colors.success,
    COMPLETED: colors.success,
    CANCELLED: colors.textMuted,
    REFUNDED: colors.danger,
    DISPUTED: colors.danger,
} as const;

export const trustLevelColors = {
    NEW: colors.textMuted,
    BASIC: colors.primary,
    VERIFIED: colors.primary,
    TRUSTED: colors.success,
    ELITE: colors.accent,
} as const;
