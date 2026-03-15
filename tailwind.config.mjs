/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0b',
        foreground: '#e8e4de',
        secondary: '#151516',
        muted:     '#6b6b6b',
        gold: {
          DEFAULT: '#c8973a',
          light:   '#dbb568',
          dark:    '#a37a2e',
        },
        primary: {
          DEFAULT: '#c8973a',
          focus:   '#dbb568',
          foreground: '#0a0a0b',
        },
        accent: {
          DEFAULT: '#c8973a',
          focus:   '#dbb568',
        },
        success: {
          DEFAULT: '#52b788',
        },
        warning: {
          DEFAULT: '#d4a843',
        },
        danger: {
          DEFAULT: '#c45c5c',
        },
        destructive: {
          DEFAULT: '#c45c5c',
          foreground: '#ffffff',
        },
      },
      fontFamily: {
        serif:      ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans:       ['Barlow', 'Helvetica', 'Arial', 'sans-serif'],
        condensed:  ['"Barlow Condensed"', 'Barlow', 'sans-serif'],
        headings:   ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body:       ['Barlow', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        default: '4px',
        small:   '2px',
      },
    },
  },
  plugins: [],
}
