/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'
  ],
  theme: {
    extend: {
      colors: {
        background: '#ffffff',
        foreground: '#09090b', /* zinc-950 */
        secondary: '#f4f4f5', /* zinc-100 */
        primary: {
          DEFAULT: '#10b981', // Emerald 500
          focus: '#059669', // Emerald 600
          foreground: '#ffffff'
        },
        accent: {
          DEFAULT: '#0ea5e9', // Sky 500
          focus: '#0284c7'  // Sky 600
        },
        success: {
          DEFAULT: '#10b981', // Matching Emerald 500
        },
        warning: {
            DEFAULT: '#eab308', // Yellow 500
        },
        danger: {
            DEFAULT: '#ef4444', // Red 500
        },
        // Retain legacy vars so we don't break everything instantly during migration
        'ehren-blue': '#0a192f',
        'ehren-green': '#10b981',
        'ehren-light': '#f8fafc',
        'ehren-accent': '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        headings: ['Inter', 'sans-serif'],
        body: ['Roboto', 'sans-serif'],
      },
      borderRadius: {
        default: '0.5rem',
        small: '0.25rem'
      }
    },
  },
  plugins: [],
}
