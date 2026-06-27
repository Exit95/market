/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'
  ],
  theme: {
    screens: {
      'xs': '420px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        background: '#F8FAFB',
        surface: '#FFFFFF',
        navy: '#1A2332',
        primary: {
          DEFAULT: '#1B65A6',
          light: '#E3F2FD',
          dark: '#14507F',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#22A06B',
          light: '#E8F5E9',
        },
        accent: {
          DEFAULT: '#D97706',
          light: '#FEF3C7',
        },
        danger: {
          DEFAULT: '#DC2626',
          light: '#FEE2E2',
        },
        warning: {
          DEFAULT: '#D97706',
          light: '#FEF3C7',
        },
        text: {
          DEFAULT: '#1A2332',
          secondary: '#64748B',
          muted: '#6B7280',
        },
        border: {
          DEFAULT: '#E5E7EB',
          light: '#F1F5F9',
        },
        foreground: '#1A2332',
        secondary: '#F8FAFB',
        teal: {
          DEFAULT: '#0D9488',
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
          light: '#CCFBF1',
          dark: '#0F766E',
          foreground: '#FFFFFF',
        },
        muted: '#64748B',
        destructive: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        body: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        headings: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        // Legacy aliases (used by pages not yet migrated to Phase 2)
        condensed: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '10px',
        sm: '6px',
        lg: '12px',
      },
      fontSize: {
        'h1': ['2rem', { lineHeight: '1.15', fontWeight: '700' }],
        'h2': ['1.5rem', { lineHeight: '1.15', fontWeight: '700' }],
        'h3': ['1.25rem', { lineHeight: '1.25', fontWeight: '600' }],
        'h4': ['1rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body-sm': ['0.875rem', { lineHeight: '1.6', fontWeight: '400' }],
        'caption': ['0.8125rem', { lineHeight: '1.5', fontWeight: '400' }],
        'label': ['0.75rem', { lineHeight: '1', fontWeight: '600', letterSpacing: '0.025em' }],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 12px 0 rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
}
