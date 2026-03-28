// Dark Mode Farbpalette
// Wird parallel zu colors.ts verwendet, je nach Theme-Einstellung

export const darkColors = {
  primary: { 50: '#172554', 100: '#1E3A8A', 200: '#1E40AF', 300: '#1D4ED8', 400: '#2563EB', 500: '#3B82F6', 600: '#60A5FA', 700: '#93C5FD', 800: '#BFDBFE', 900: '#DBEAFE' },
  success: { 50: '#052e16', 100: '#064e3b', 500: '#10B981', 600: '#34D399', 700: '#6EE7B7' },
  warning: { 50: '#451a03', 100: '#78350f', 500: '#F59E0B', 600: '#FBBF24' },
  error: { 50: '#450a0a', 100: '#7f1d1d', 500: '#EF4444', 600: '#F87171' },
  neutral: { 50: '#171717', 100: '#1C1C1C', 200: '#262626', 300: '#404040', 400: '#525252', 500: '#737373', 600: '#A3A3A3', 700: '#D4D4D4', 800: '#E5E5E5', 900: '#F5F5F5' },
  white: '#171717',
  black: '#FAFAFA',
  background: '#0A0A0A',
  surface: '#171717',
  trustNew: '#6B7280',
  trustConfirmed: '#60A5FA',
  trustVerified: '#34D399',
  trustTrusted: '#FBBF24',
  trustIdentified: '#93C5FD',
  dealInquiry: '#60A5FA',
  dealNegotiating: '#60A5FA',
  dealReserved: '#FBBF24',
  dealAgreed: '#FBBF24',
  dealPaid: '#34D399',
  dealShipped: '#34D399',
  dealCompleted: '#34D399',
  dealCanceled: '#6B7280',
  dealConflict: '#F87171',
} as const;
