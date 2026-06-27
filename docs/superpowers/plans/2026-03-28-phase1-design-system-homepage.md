# Phase 1: Design-System & Homepage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dark/gold theme with a trust-first light design system and rebuild the homepage to communicate safety and reliability.

**Architecture:** Update Tailwind config + global.css as the design foundation, then rebuild Header, Footer, BaseLayout, and Homepage using the new tokens. Self-host Inter variable font. Remove grain texture, glass-morphism, and all dark-theme patterns.

**Tech Stack:** Astro 5, Tailwind CSS 3.4, Inter Variable Font (self-hosted)

---

## File Structure

### Modified Files
| File | Responsibility |
|------|---------------|
| `tailwind.config.mjs` | Color tokens, font families, border radius, spacing |
| `src/styles/global.css` | CSS variables, base styles, component classes |
| `src/layouts/BaseLayout.astro` | Font loading, meta tags, theme-color, remove grain div |
| `src/components/Header.astro` | Light theme header with new tokens |
| `src/components/Footer.astro` | Navy footer with trust bar |
| `src/pages/index.astro` | Complete homepage rebuild |

### New Files
| File | Responsibility |
|------|---------------|
| `public/fonts/Inter-Variable.woff2` | Self-hosted Inter variable font |

---

### Task 1: Download and self-host Inter variable font

**Files:**
- Create: `public/fonts/Inter-Variable.woff2`

- [ ] **Step 1: Download Inter variable font**

```bash
curl -L -o public/fonts/Inter-Variable.woff2 "https://github.com/rsms/inter/releases/download/v4.1/Inter-Variable.woff2"
```

If curl fails (network/firewall), download manually from https://github.com/rsms/inter/releases and place the `Inter-Variable.woff2` file in `public/fonts/`.

- [ ] **Step 2: Verify the file exists**

```bash
ls -la public/fonts/Inter-Variable.woff2
```

Expected: File exists, size ~300-400KB.

- [ ] **Step 3: Commit**

```bash
git add public/fonts/Inter-Variable.woff2
git commit -m "feat: add self-hosted Inter variable font"
```

---

### Task 2: Replace Tailwind config with trust-first design tokens

**Files:**
- Modify: `tailwind.config.mjs` (complete rewrite of theme section)

- [ ] **Step 1: Replace tailwind.config.mjs with new design tokens**

Replace the entire file content with:

```javascript
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
          muted: '#94A3B8',
        },
        border: {
          DEFAULT: '#E5E7EB',
          light: '#F1F5F9',
        },
        // Legacy aliases for components that still use old names
        foreground: '#1A2332',
        secondary: '#F8FAFB',
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
```

- [ ] **Step 2: Verify Tailwind config is valid**

```bash
npx tailwindcss --content './src/**/*.astro' --output /dev/null 2>&1 | head -5
```

Expected: No syntax errors.

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.mjs
git commit -m "feat: replace dark/gold tailwind tokens with trust-first light theme"
```

---

### Task 3: Replace global.css with light theme base styles and components

**Files:**
- Modify: `src/styles/global.css` (complete rewrite)

- [ ] **Step 1: Replace global.css with new design system**

Replace the entire file content with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── Self-hosted Inter Variable Font ── */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Variable.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-display: optional;
  font-style: normal;
}

@layer base {
  :root {
    /* ── Ehren-Deal Trust-First Design System ── */
    --primary: #1B65A6;
    --primary-light: #E3F2FD;
    --success: #22A06B;
    --success-light: #E8F5E9;
    --accent: #D97706;
    --accent-light: #FEF3C7;
    --danger: #DC2626;
    --navy: #1A2332;
    --bg: #F8FAFB;
    --surface: #FFFFFF;
    --text: #1A2332;
    --text-secondary: #64748B;
    --border: #E5E7EB;

    /* ── Component tokens (used by ChatApp, HandshakeApp) ── */
    --ehren-primary: #1B65A6;
    --ehren-accent: #22A06B;
    --ehren-blue: #1B65A6;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    @apply bg-background text-text font-body antialiased;
    font-size: 16px;
    line-height: 1.6;
  }

  ::selection {
    background: rgba(27, 101, 166, 0.2);
    color: #1A2332;
  }

  h1, h2, h3, h4, h5, h6 {
    @apply font-headings text-text;
    line-height: 1.15;
  }
  h1 { @apply text-h1; }
  h2 { @apply text-h2; }
  h3 { @apply text-h3; }
  h4 { @apply text-h4; }

  :focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  a {
    @apply text-primary;
  }
}

/* ── Select / Dropdown styling ── */
select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2.25rem;
}

/* ── Hide scrollbars (keep functionality) ── */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

@layer components {
  /* ── Buttons ── */
  .btn-primary {
    @apply inline-flex items-center justify-center px-7 py-3.5 rounded-DEFAULT font-semibold text-base text-primary-foreground bg-primary hover:bg-primary-dark transition-colors duration-200;
  }

  .btn-secondary {
    @apply inline-flex items-center justify-center px-6 py-3 rounded-DEFAULT font-semibold text-sm text-text bg-surface border border-border hover:bg-background transition-colors duration-200;
  }

  .btn-outline {
    @apply inline-flex items-center justify-center px-6 py-3 rounded-DEFAULT font-medium text-sm text-primary border border-primary/40 hover:bg-primary hover:text-primary-foreground transition-colors duration-200;
  }

  .btn-success {
    @apply inline-flex items-center justify-center px-6 py-3 rounded-DEFAULT font-semibold text-sm text-white bg-success hover:brightness-110 transition-all duration-200;
  }

  .btn-ghost {
    @apply inline-flex items-center justify-center px-4 py-2 rounded-DEFAULT font-medium text-sm text-primary hover:bg-primary-light transition-colors duration-200;
  }

  .btn-danger {
    @apply inline-flex items-center justify-center px-5 py-2 rounded-DEFAULT font-medium text-sm text-danger border border-danger/40 hover:bg-danger-light transition-colors duration-200;
  }

  /* ── Form fields ── */
  .input-field {
    @apply w-full px-4 py-3 rounded-DEFAULT border border-border bg-surface text-text placeholder-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-base;
  }

  .select-field {
    @apply w-full px-4 py-3 rounded-DEFAULT border border-border bg-surface text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm;
  }

  /* ── Trust badges ── */
  .badge-treuhand {
    @apply inline-flex items-center px-3 py-1 bg-success-light text-success rounded-sm text-label font-semibold;
  }

  .badge-verifiziert {
    @apply inline-flex items-center px-3 py-1 bg-primary-light text-primary rounded-sm text-label font-semibold;
  }

  .badge-elite {
    @apply inline-flex items-center px-3 py-1 bg-accent-light text-accent rounded-sm text-label font-semibold;
  }

  /* ── Category pill ── */
  .category-pill {
    @apply inline-flex items-center px-4 py-2 text-sm font-medium border rounded-DEFAULT transition-colors duration-200 whitespace-nowrap;
  }
  .category-pill:not(.active) {
    @apply border-border text-text-secondary bg-surface hover:border-primary/40 hover:text-primary;
  }
  .category-pill.active {
    @apply border-primary bg-primary text-primary-foreground;
  }

  /* ── Info box (Risk Reversal) ── */
  .info-box {
    @apply bg-primary-light/50 rounded-DEFAULT p-4 text-sm text-text;
  }

  /* ── Card ── */
  .card {
    @apply bg-surface border border-border rounded-lg overflow-hidden shadow-card hover:shadow-card-hover transition-shadow duration-200;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: replace dark theme global.css with trust-first light design system"
```

---

### Task 4: Update BaseLayout with self-hosted fonts and remove grain

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

- [ ] **Step 1: Replace BaseLayout.astro**

Replace the entire file content with:

```astro
---
import "../styles/global.css";

interface Props {
  title?: string;
  description?: string;
  ogImage?: string;
  canonicalPath?: string;
}
const {
  title = "Ehren-Deal – Sicher kaufen und verkaufen",
  description = "Deutschlands sicherster C2C-Marktplatz mit Treuhand-Schutz. Dein Geld ist sicher, bis du zufrieden bist.",
  ogImage = "/og-default.png",
  canonicalPath,
} = Astro.props;

const siteUrl = "https://ehren-deal.de";
const canonical = canonicalPath ? `${siteUrl}${canonicalPath}` : Astro.url.href;
---

<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content={description} />
    <meta name="theme-color" content="#1B65A6" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="canonical" href={canonical} />

    <!-- Preload Inter Variable Font (above-the-fold critical) -->
    <link rel="preload" href="/fonts/Inter-Variable.woff2" as="font" type="font/woff2" crossorigin />

    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="de_DE" />
    <meta property="og:site_name" content="Ehren-Deal" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonical} />
    <meta property="og:image" content={`${siteUrl}${ogImage}`} />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={`${siteUrl}${ogImage}`} />

    <title>{title}</title>

    <!-- JSON-LD WebSite -->
    <script is:inline type="application/ld+json" set:html={JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Ehren-Deal",
      "url": siteUrl,
      "description": description,
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${siteUrl}/kategorien?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    })} />
  </head>
  <body class="bg-background text-text font-body antialiased">
    <slot />
  </body>
</html>
```

Key changes:
- Removed Google Fonts CDN links (Cormorant Garamond, Barlow, Barlow Condensed)
- Added preload for self-hosted Inter Variable Font
- Removed `<div class="bg-grain"></div>` (grain texture)
- Updated theme-color from `#0a0a0b` to `#1B65A6`
- Updated default title and description to trust-focused messaging
- Updated body classes from `text-foreground` to `text-text`

- [ ] **Step 2: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "feat: update BaseLayout with self-hosted Inter font, remove grain texture"
```

---

### Task 5: Rebuild Header component with light theme

**Files:**
- Modify: `src/components/Header.astro`

- [ ] **Step 1: Replace Header.astro**

Replace the entire file content with:

```astro
---
import { lucia } from '../lib/auth';

const navLinks = [
    { href: "/", label: "Startseite" },
    { href: "/kategorien", label: "Kategorien" },
    { href: "/sicherheit", label: "Sicherheit" },
];
const currentPath = Astro.url.pathname;

let authUser: { firstName: string | null; lastName: string | null; email: string; role: string } | null = null;
const sessionId = Astro.cookies.get(lucia.sessionCookieName)?.value;
if (sessionId) {
    try {
        const { user } = await lucia.validateSession(sessionId);
        if (user) {
            authUser = { firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role };
        }
    } catch { /* session invalid */ }
}
const displayName = authUser?.firstName || authUser?.email?.split('@')[0] || 'Konto';
---

<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded">
    Zum Inhalt springen
</a>

<header class="sticky top-0 z-50 bg-surface border-b border-border">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
            <!-- Logo -->
            <a href="/" class="flex items-center gap-2 flex-shrink-0">
                <span class="font-bold text-lg text-navy tracking-tight">
                    Ehren-Deal
                </span>
            </a>

            <!-- Desktop Nav -->
            <nav class="hidden md:flex items-center gap-8">
                {navLinks.map((link) => (
                    <a
                        href={link.href}
                        class={`text-sm font-medium transition-colors duration-200 ${
                            currentPath === link.href
                            ? "text-primary"
                            : "text-text-secondary hover:text-text"
                        }`}
                    >
                        {link.label}
                    </a>
                ))}
            </nav>

            <!-- Right side -->
            <div class="hidden md:flex items-center gap-4">
                {authUser ? (
                    <>
                        <a href="/dashboard/deals" class="text-sm font-medium text-text-secondary hover:text-text transition-colors">
                            Meine Deals
                        </a>
                        <div class="relative" id="userMenuWrap">
                            <button id="userMenuBtn" class="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text transition-colors">
                                <div class="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center text-xs font-bold">
                                    {(authUser.firstName?.[0] || authUser.email[0]).toUpperCase()}
                                </div>
                                {displayName}
                            </button>
                            <div id="userDropdown" class="hidden absolute right-0 top-full mt-2 w-52 bg-surface border border-border rounded-DEFAULT shadow-lg z-50 py-1">
                                <a href="/profil" class="block px-4 py-2.5 text-sm text-text-secondary hover:bg-background hover:text-text transition-colors">Profil</a>
                                <a href="/merkliste" class="block px-4 py-2.5 text-sm text-text-secondary hover:bg-background hover:text-text transition-colors">Merkliste</a>
                                <a href="/dashboard/deals" class="block px-4 py-2.5 text-sm text-text-secondary hover:bg-background hover:text-text transition-colors">Meine Deals</a>
                                {authUser.role === 'ADMIN' && (
                                    <a href="/admin" class="block px-4 py-2.5 text-sm text-primary hover:bg-primary-light transition-colors">Admin</a>
                                )}
                                <button id="logoutBtn" class="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:bg-background hover:text-text transition-colors border-t border-border">Abmelden</button>
                            </div>
                        </div>
                    </>
                ) : (
                    <a href="/anmelden" class="text-sm font-medium text-text-secondary hover:text-text transition-colors">
                        Anmelden
                    </a>
                )}
                <a href="/inserat-erstellen" class="btn-primary text-sm py-2 px-5">
                    Anzeige aufgeben
                </a>
            </div>

            <!-- Mobile Menu Button -->
            <button
                class="md:hidden p-2 text-text-secondary hover:text-text transition-colors focus:outline-none"
                id="mobileMenuBtn"
                aria-label="Menü öffnen"
                aria-expanded="false"
                aria-controls="mobileMenu"
            >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
        </div>
    </div>

    <!-- Mobile Menu -->
    <div class="md:hidden absolute top-full left-0 w-full bg-surface border-b border-border z-40" id="mobileMenu" style="max-height:0;overflow:hidden;transition:max-height 0.3s ease;">
        <div class="px-6 pt-3 pb-6 space-y-1">
            {navLinks.map((link) => (
                <a
                    href={link.href}
                    class={`block py-3 text-sm font-medium border-b border-border-light ${
                        currentPath === link.href ? "text-primary" : "text-text-secondary hover:text-text"
                    }`}
                >
                    {link.label}
                </a>
            ))}
            <div class="pt-4 space-y-3">
                {authUser ? (
                    <>
                        <a href="/dashboard/deals" class="block text-center py-3 text-sm font-medium text-text-secondary hover:text-text transition-colors">
                            Meine Deals
                        </a>
                        <a href="/merkliste" class="block text-center py-3 text-sm font-medium text-text-secondary hover:text-text transition-colors">
                            Merkliste
                        </a>
                        <button id="mobileLogoutBtn" class="block w-full text-center py-3 text-sm font-medium text-text-secondary hover:text-text transition-colors">
                            Abmelden
                        </button>
                    </>
                ) : (
                    <a href="/anmelden" class="block text-center py-3 text-sm font-medium text-text-secondary hover:text-text transition-colors">
                        Anmelden
                    </a>
                )}
                <a href="/inserat-erstellen" class="btn-primary w-full flex items-center justify-center py-3">
                    Anzeige aufgeben
                </a>
            </div>
        </div>
    </div>
</header>

<script>
    const btn = document.getElementById("mobileMenuBtn");
    const menu = document.getElementById("mobileMenu") as HTMLElement | null;
    const btnSvg = btn?.querySelector("svg");

    const hamburgerPath = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16"></path>';
    const xPath = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 6l12 12M6 18L18 6"></path>';

    let mobileMenuOpen = false;

    btn?.addEventListener("click", () => {
        mobileMenuOpen = !mobileMenuOpen;
        if (mobileMenuOpen) {
            if (menu) menu.style.maxHeight = "500px";
            if (btnSvg) btnSvg.innerHTML = xPath;
            btn.setAttribute('aria-expanded', 'true');
            btn.setAttribute('aria-label', 'Menü schließen');
        } else {
            if (menu) menu.style.maxHeight = "0";
            if (btnSvg) btnSvg.innerHTML = hamburgerPath;
            btn.setAttribute('aria-expanded', 'false');
            btn.setAttribute('aria-label', 'Menü öffnen');
        }
    });

    const userMenuBtn = document.getElementById("userMenuBtn");
    const userDropdown = document.getElementById("userDropdown");
    userMenuBtn?.addEventListener("click", () => {
        userDropdown?.classList.toggle("hidden");
    });
    document.addEventListener("click", (e) => {
        if (userDropdown && !userDropdown.classList.contains("hidden")) {
            const wrap = document.getElementById("userMenuWrap");
            if (wrap && !wrap.contains(e.target as Node)) {
                userDropdown.classList.add("hidden");
            }
        }
    });

    async function doLogout() {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } catch { /* ignore */ }
        window.location.href = "/";
    }
    document.getElementById("logoutBtn")?.addEventListener("click", doLogout);
    document.getElementById("mobileLogoutBtn")?.addEventListener("click", doLogout);
</script>
```

Key changes:
- White/surface background instead of dark blur
- Removed `font-condensed`, `uppercase`, `tracking-wider` from all nav items
- Text logo "Ehren-Deal" in navy bold instead of image + condensed uppercase
- Skip-to-content link for accessibility
- Initials avatar circle in `primary-light` instead of SVG icon
- Dropdown uses `bg-surface`, `border-border` instead of dark glass
- "Anzeige aufgeben" is now `btn-primary` (blue) instead of `btn-outline` (gold border)

- [ ] **Step 2: Commit**

```bash
git add src/components/Header.astro
git commit -m "feat: rebuild Header with light trust-first theme"
```

---

### Task 6: Rebuild Footer component with navy theme

**Files:**
- Modify: `src/components/Footer.astro`

- [ ] **Step 1: Replace Footer.astro**

Replace the entire file content with:

```astro
---
---

<footer class="mt-auto">
    <!-- Trust bar -->
    <div class="bg-primary-light/50 border-t border-border">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
                <div class="flex items-center gap-3 sm:justify-start justify-center px-4 py-2">
                    <div class="w-10 h-10 rounded-full bg-success flex items-center justify-center text-white text-sm font-bold flex-shrink-0">T</div>
                    <div>
                        <div class="text-sm font-semibold text-text">Treuhand-Schutz</div>
                        <div class="text-caption text-text-secondary">Geld sicher bis Warenerhalt</div>
                    </div>
                </div>
                <div class="flex items-center gap-3 sm:justify-start justify-center px-4 py-2">
                    <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">V</div>
                    <div>
                        <div class="text-sm font-semibold text-text">Verifizierte Identitäten</div>
                        <div class="text-caption text-text-secondary">KYC-geprüfte Verkäufer</div>
                    </div>
                </div>
                <div class="flex items-center gap-3 sm:justify-start justify-center px-4 py-2">
                    <div class="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white text-sm font-bold flex-shrink-0">S</div>
                    <div>
                        <div class="text-sm font-semibold text-text">Trust-Score System</div>
                        <div class="text-caption text-text-secondary">Transparente Bewertungen</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Main footer -->
    <div class="bg-navy text-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
                <!-- Brand -->
                <div class="col-span-2 md:col-span-1 space-y-3">
                    <a href="/" class="inline-block">
                        <span class="font-bold text-lg text-white tracking-tight">
                            Ehren-Deal
                        </span>
                    </a>
                    <p class="text-sm leading-relaxed text-white/60 max-w-[220px]">
                        Deutschlands sicherster C2C-Marktplatz mit Treuhand-Schutz und Identitätsprüfung.
                    </p>
                </div>

                <!-- Käufer -->
                <div>
                    <h4 class="text-label uppercase text-white/50 mb-4 tracking-wider">Für Käufer</h4>
                    <ul class="space-y-2.5">
                        <li><a href="/" class="text-sm text-white/70 hover:text-white transition-colors">Angebote entdecken</a></li>
                        <li><a href="/sicherheit" class="text-sm text-white/70 hover:text-white transition-colors">Käuferschutz</a></li>
                        <li><a href="/sicher-kaufen" class="text-sm text-white/70 hover:text-white transition-colors">Sicher kaufen</a></li>
                        <li><a href="/merkliste" class="text-sm text-white/70 hover:text-white transition-colors">Merkliste</a></li>
                    </ul>
                </div>

                <!-- Verkäufer -->
                <div>
                    <h4 class="text-label uppercase text-white/50 mb-4 tracking-wider">Für Verkäufer</h4>
                    <ul class="space-y-2.5">
                        <li><a href="/inserat-erstellen" class="text-sm text-white/70 hover:text-white transition-colors">Anzeige aufgeben</a></li>
                        <li><a href="/anmelden" class="text-sm text-white/70 hover:text-white transition-colors">Identität bestätigen</a></li>
                        <li><a href="/profil" class="text-sm text-white/70 hover:text-white transition-colors">Trust Score aufbauen</a></li>
                        <li><a href="/sicherheit" class="text-sm text-white/70 hover:text-white transition-colors">Treuhand-Abwicklung</a></li>
                    </ul>
                </div>

                <!-- Legal -->
                <div>
                    <h4 class="text-label uppercase text-white/50 mb-4 tracking-wider">Unternehmen</h4>
                    <ul class="space-y-2.5">
                        <li><a href="/kontakt" class="text-sm text-white/70 hover:text-white transition-colors">Kontakt & Support</a></li>
                        <li><a href="/agb" class="text-sm text-white/70 hover:text-white transition-colors">AGB</a></li>
                        <li><a href="/datenschutz" class="text-sm text-white/70 hover:text-white transition-colors">Datenschutz</a></li>
                        <li><a href="/impressum" class="text-sm text-white/70 hover:text-white transition-colors">Impressum</a></li>
                    </ul>
                </div>
            </div>

            <!-- Bottom -->
            <div class="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p class="text-sm text-white/40">
                    &copy; 2026 Ehren-Deal
                </p>
                <div class="flex items-center gap-6 text-sm text-white/40">
                    <a href="/impressum" class="hover:text-white transition-colors">Impressum</a>
                    <a href="/datenschutz" class="hover:text-white transition-colors">Datenschutz</a>
                    <a href="/agb" class="hover:text-white transition-colors">AGB</a>
                </div>
            </div>
        </div>
    </div>
</footer>
```

Key changes:
- Trust bar on light blue background instead of dark glass
- Letter initials in colored circles instead of SVG icons
- Navy footer background instead of near-black
- Removed all `font-condensed`, `uppercase tracking-wider` from links
- Clean, readable 14px links instead of tiny uppercase text
- Standard font weights instead of `font-light`

- [ ] **Step 2: Commit**

```bash
git add src/components/Footer.astro
git commit -m "feat: rebuild Footer with navy background and trust bar"
```

---

### Task 7: Rebuild Homepage with trust-first architecture

**Files:**
- Modify: `src/pages/index.astro`

This is the largest task. The homepage gets rebuilt with the structure from the spec: Hero > Trust Bar > Categories > Listings > How it Works > Risk Reversal > Testimonials > FAQ > Final CTA.

- [ ] **Step 1: Replace index.astro**

Replace the entire file content with:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import Header from "../components/Header.astro";
import Footer from "../components/Footer.astro";
import { categories } from "../data/listings";

const url = new URL("/api/listings", Astro.url.origin);
url.searchParams.set("pageSize", "20");
url.searchParams.set("page", "1");

for (const [k, v] of Astro.url.searchParams) {
    if (["query", "category", "minPrice", "maxPrice", "city", "lat", "lng", "radius", "page", "pageSize", "sort"].includes(k)) {
        url.searchParams.set(k, v);
    }
}

const res = await fetch(url.toString());
const data = res.ok
    ? await res.json()
    : { listings: [], pagination: { total: 0, totalPages: 1, page: 1 } };
const { listings, pagination } = data;

const currentPage = pagination.page ?? 1;
const totalPages = pagination.totalPages ?? 1;
const currentQuery = Astro.url.searchParams.get("query") ?? "";
const currentCat = Astro.url.searchParams.get("category") ?? "";
const currentSort = Astro.url.searchParams.get("sort") ?? "";
const currentMinPrice = Astro.url.searchParams.get("minPrice") ?? "";
const currentMaxPrice = Astro.url.searchParams.get("maxPrice") ?? "";
---

<BaseLayout title="Ehren-Deal – Sicher kaufen und verkaufen">
    <Header />
    <main id="main-content" class="min-h-screen">

        <!-- ═══ Hero ═══ -->
        <section class="bg-gradient-to-br from-navy to-[#1B3A5C] text-white py-16 sm:py-24">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="max-w-2xl">
                    <p class="text-sm font-semibold text-success mb-3 tracking-wide">Käuferschutz bei jedem Deal</p>
                    <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-[1.1] mb-4">
                        Kaufen und verkaufen.<br>Mit echtem Schutz.
                    </h1>
                    <p class="text-lg text-white/70 mb-8 max-w-lg">
                        Der Marktplatz mit Treuhand-Zahlung. Dein Geld ist sicher, bis du zufrieden bist.
                    </p>

                    <!-- Search bar -->
                    <form id="searchForm" method="GET" class="flex flex-col sm:flex-row gap-2 max-w-xl mb-6">
                        <label class="sr-only" for="searchQuery">Suchbegriff</label>
                        <input
                            id="searchQuery"
                            name="query"
                            value={currentQuery}
                            placeholder="Was suchst du?"
                            class="flex-grow px-4 py-3.5 rounded-DEFAULT bg-white text-text placeholder-text-muted text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        <button type="submit" class="bg-primary hover:bg-primary-dark text-white px-8 py-3.5 rounded-DEFAULT font-semibold transition-colors">
                            Suchen
                        </button>
                    </form>

                    <div class="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
                        <span>Treuhand-Schutz</span>
                        <span>Verifizierte Nutzer</span>
                        <span>Digitaler Handschlag</span>
                    </div>
                </div>
            </div>
        </section>

        <!-- ═══ Trust Bar ═══ -->
        <section class="bg-primary-light/40 border-b border-border py-6">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
                    <div class="flex items-center gap-3 sm:justify-start justify-center">
                        <div class="w-10 h-10 rounded-full bg-success flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">G</div>
                        <div>
                            <div class="text-sm font-semibold text-text">Geld-zurück-Garantie</div>
                            <div class="text-caption text-text-secondary">Zahlung erst nach Erhalt</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 sm:justify-start justify-center">
                        <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">V</div>
                        <div>
                            <div class="text-sm font-semibold text-text">Verifizierte Identitäten</div>
                            <div class="text-caption text-text-secondary">KYC-geprüfte Verkäufer</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 sm:justify-start justify-center">
                        <div class="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">T</div>
                        <div>
                            <div class="text-sm font-semibold text-text">Trust-Score System</div>
                            <div class="text-caption text-text-secondary">Transparente Bewertungen</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ═══ Categories + Listings ═══ -->
        <section class="py-10">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                <!-- Category pills -->
                <div class="mb-8">
                    <div class="flex flex-wrap gap-2">
                        <a href="/" class={`category-pill ${!currentCat ? 'active' : ''}`}>Alle</a>
                        {categories.map((c) => (
                            <a
                                href={`/?category=${c.slug.toUpperCase()}`}
                                class={`category-pill ${currentCat === c.slug.toUpperCase() ? 'active' : ''}`}
                            >
                                {c.label}
                            </a>
                        ))}
                    </div>
                </div>

                <!-- Filter bar -->
                <div class="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
                    <p class="text-sm text-text-secondary">
                        <span class="font-semibold text-text">{pagination.total}</span>
                        {" "}Anzeige{pagination.total !== 1 ? "n" : ""}
                        {currentQuery && <span> für <em class="not-italic font-semibold text-primary">„{currentQuery}"</em></span>}
                    </p>
                    <div class="flex items-center gap-3">
                        <!-- Price filters -->
                        <form id="filterForm" method="GET" class="hidden sm:flex items-center gap-2">
                            {currentQuery && <input type="hidden" name="query" value={currentQuery} />}
                            {currentCat && <input type="hidden" name="category" value={currentCat} />}
                            <label class="sr-only" for="minPrice">Mindestpreis</label>
                            <input id="minPrice" name="minPrice" type="number" min="0" value={currentMinPrice} placeholder="€ von" class="input-field w-24 text-sm py-2" />
                            <label class="sr-only" for="maxPrice">Maximalpreis</label>
                            <input id="maxPrice" name="maxPrice" type="number" min="0" value={currentMaxPrice} placeholder="€ bis" class="input-field w-24 text-sm py-2" />
                            <button type="submit" class="btn-ghost text-sm py-2">Filtern</button>
                        </form>
                        <!-- Sort -->
                        <form method="GET" id="sortForm">
                            {currentQuery && <input type="hidden" name="query" value={currentQuery} />}
                            {currentCat && <input type="hidden" name="category" value={currentCat} />}
                            {currentMinPrice && <input type="hidden" name="minPrice" value={currentMinPrice} />}
                            {currentMaxPrice && <input type="hidden" name="maxPrice" value={currentMaxPrice} />}
                            <select name="sort" onchange="this.form.submit()" class="select-field w-auto py-2 px-3 text-sm cursor-pointer">
                                <option value="" selected={!currentSort}>Neueste zuerst</option>
                                <option value="price_asc" selected={currentSort === "price_asc"}>Preis aufsteigend</option>
                                <option value="price_desc" selected={currentSort === "price_desc"}>Preis absteigend</option>
                            </select>
                        </form>
                    </div>
                </div>

                <!-- Listings Grid -->
                {listings.length > 0 ? (
                    <div class="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {listings.map((l: any, i: number) => (
                            <a href={`/inserat/${l.id}`} class="group block h-full">
                                <article class="card h-full flex flex-col">
                                    <!-- Image -->
                                    <div class="aspect-[4/3] w-full bg-background relative overflow-hidden flex-shrink-0">
                                        {l.images[0] ? (
                                            <img
                                                src={l.images[0].url}
                                                alt={l.title}
                                                width="400"
                                                height="300"
                                                class="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                                                loading={i < 4 ? "eager" : "lazy"}
                                                fetchpriority={i === 0 ? "high" : "auto"}
                                            />
                                        ) : (
                                            <div class="w-full h-full flex items-center justify-center text-text-muted text-sm">
                                                Kein Bild
                                            </div>
                                        )}
                                    </div>

                                    <!-- Content -->
                                    <div class="p-4 flex flex-col flex-grow">
                                        <!-- Badges -->
                                        <div class="flex flex-wrap gap-1.5 mb-2">
                                            {l.treuhand && (
                                                <span class="badge-treuhand">Treuhand-Schutz</span>
                                            )}
                                            {l.seller?.trustScore?.level && ['VERIFIED', 'TRUSTED', 'ELITE'].includes(l.seller.trustScore.level) && (
                                                <span class="badge-verifiziert">Verifiziert</span>
                                            )}
                                        </div>

                                        <h3 class="font-semibold text-text mb-1 line-clamp-2 leading-snug text-sm">
                                            {l.title}
                                        </h3>

                                        <div class="mt-auto pt-3 flex items-end justify-between">
                                            <div class="text-lg font-bold text-primary">
                                                {(l.price / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                                            </div>
                                            <div class="text-caption text-text-muted truncate ml-2">
                                                {l.city}
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            </a>
                        ))}
                    </div>
                ) : (
                    <div class="text-center py-20 rounded-DEFAULT border border-dashed border-border">
                        <h3 class="text-h3 text-text mb-2">Keine Angebote gefunden</h3>
                        <p class="text-text-secondary max-w-sm mx-auto">
                            Versuche andere Suchbegriffe oder erweitere deine Filterkriterien.
                        </p>
                    </div>
                )}

                <!-- Pagination -->
                {totalPages > 1 && (
                    <nav class="flex items-center justify-center gap-4 mt-12 pb-4">
                        {currentPage > 1 && (
                            <a
                                href={`?${new URLSearchParams({ ...Object.fromEntries(Astro.url.searchParams), page: String(currentPage - 1) })}`}
                                class="btn-secondary"
                            >
                                Zurück
                            </a>
                        )}
                        <span class="text-sm text-text-secondary font-medium px-4">
                            Seite {currentPage} von {totalPages}
                        </span>
                        {currentPage < totalPages && (
                            <a
                                href={`?${new URLSearchParams({ ...Object.fromEntries(Astro.url.searchParams), page: String(currentPage + 1) })}`}
                                class="btn-primary text-sm py-2 px-6"
                            >
                                Weiter
                            </a>
                        )}
                    </nav>
                )}
            </div>
        </section>

        <!-- ═══ So funktioniert's ═══ -->
        <section class="py-16 bg-surface border-t border-border">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center mb-12">
                    <h2 class="text-h2 mb-2">So funktioniert Ehren-Deal</h2>
                    <p class="text-text-secondary">In drei Schritten sicher handeln</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-3xl mx-auto">
                    <div class="text-center">
                        <div class="w-12 h-12 rounded-full bg-primary-light text-primary text-lg font-bold flex items-center justify-center mx-auto mb-4">1</div>
                        <h3 class="text-h4 mb-2">Inserat finden</h3>
                        <p class="text-sm text-text-secondary leading-relaxed">Stöbere in Tausenden Inseraten oder nutze die Suche.</p>
                    </div>
                    <div class="text-center">
                        <div class="w-12 h-12 rounded-full bg-success-light text-success text-lg font-bold flex items-center justify-center mx-auto mb-4">2</div>
                        <h3 class="text-h4 mb-2">Sicher bezahlen</h3>
                        <p class="text-sm text-text-secondary leading-relaxed">Zahle per Treuhand — dein Geld wird erst freigegeben, wenn du zufrieden bist.</p>
                    </div>
                    <div class="text-center">
                        <div class="w-12 h-12 rounded-full bg-accent-light text-accent text-lg font-bold flex items-center justify-center mx-auto mb-4">3</div>
                        <h3 class="text-h4 mb-2">Deal bestätigen</h3>
                        <p class="text-sm text-text-secondary leading-relaxed">Bestätige den Erhalt per QR-Code, Versand-Tracking oder digital.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- ═══ Risk Reversal ═══ -->
        <section class="py-16 bg-primary-light/40">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center mb-10">
                    <h2 class="text-h2 mb-2">Dein Geld ist sicher. Immer.</h2>
                    <p class="text-text-secondary">Unser Treuhand-System schützt jeden Kauf</p>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4 max-w-2xl mx-auto">
                    <div class="flex gap-3 items-start">
                        <svg class="w-5 h-5 text-success flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        <div>
                            <div class="font-semibold text-sm text-text">Geld-zurück-Garantie</div>
                            <div class="text-caption text-text-secondary">Nicht zufrieden? Volle Erstattung.</div>
                        </div>
                    </div>
                    <div class="flex gap-3 items-start">
                        <svg class="w-5 h-5 text-success flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        <div>
                            <div class="font-semibold text-sm text-text">Verifizierte Verkäufer</div>
                            <div class="text-caption text-text-secondary">ID-Prüfung für mehr Sicherheit</div>
                        </div>
                    </div>
                    <div class="flex gap-3 items-start">
                        <svg class="w-5 h-5 text-success flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        <div>
                            <div class="font-semibold text-sm text-text">Sichere Zahlung</div>
                            <div class="text-caption text-text-secondary">Verschlüsselt und PCI-konform</div>
                        </div>
                    </div>
                    <div class="flex gap-3 items-start">
                        <svg class="w-5 h-5 text-success flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        <div>
                            <div class="font-semibold text-sm text-text">Streitfall-Lösung</div>
                            <div class="text-caption text-text-secondary">Wir vermitteln bei Problemen</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ═══ Testimonials ═══ -->
        <section class="py-16 bg-surface">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center mb-10">
                    <h2 class="text-h2 mb-2">Was unsere Nutzer sagen</h2>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                    <div class="card p-6">
                        <div class="text-sm text-accent mb-3">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
                        <p class="text-sm text-text-secondary leading-relaxed mb-5">"Endlich eine Plattform, der man vertrauen kann. Der Treuhand-Schutz gibt mir als Käuferin ein gutes Gefühl."</p>
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center text-sm font-bold">S</div>
                            <div>
                                <div class="text-sm font-semibold text-text">Sarah M.</div>
                                <div class="text-caption text-text-secondary">Berlin</div>
                            </div>
                        </div>
                    </div>
                    <div class="card p-6">
                        <div class="text-sm text-accent mb-3">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
                        <p class="text-sm text-text-secondary leading-relaxed mb-5">"Schnell, seriös und fair. Meine Inserate werden schnell gefunden und die Kommunikation ist top."</p>
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center text-sm font-bold">T</div>
                            <div>
                                <div class="text-sm font-semibold text-text">Thomas K.</div>
                                <div class="text-caption text-text-secondary">München</div>
                            </div>
                        </div>
                    </div>
                    <div class="card p-6">
                        <div class="text-sm text-accent mb-3">&#9733;&#9733;&#9733;&#9733;&#9734;</div>
                        <p class="text-sm text-text-secondary leading-relaxed mb-5">"Die Verifizierung der Verkäufer macht den Unterschied. Hier fühle ich mich sicher beim Kauf."</p>
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center text-sm font-bold">L</div>
                            <div>
                                <div class="text-sm font-semibold text-text">Lisa R.</div>
                                <div class="text-caption text-text-secondary">Hamburg</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ═══ FAQ ═══ -->
        <section class="py-16">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center mb-10">
                    <h2 class="text-h2 mb-2">Häufig gestellte Fragen</h2>
                </div>
                <div class="max-w-2xl mx-auto flex flex-col gap-3" id="faqAccordion">
                    <div class="card overflow-hidden">
                        <button type="button" class="faq-toggle w-full flex items-center justify-between p-5 cursor-pointer text-sm font-semibold text-text hover:text-primary transition-colors text-left" aria-expanded="false">
                            <span>Was ist der Treuhand-Schutz?</span>
                            <svg class="w-4 h-4 text-text-muted transition-transform duration-200 faq-chevron flex-shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                        <div class="faq-content hidden px-5 pb-5 text-sm text-text-secondary leading-relaxed">
                            Beim Treuhand-Schutz wird dein Geld sicher auf einem Treuhandkonto verwahrt. Erst wenn du den Erhalt der Ware bestätigst, wird der Betrag an den Verkäufer freigegeben. So bist du als Käufer immer geschützt.
                        </div>
                    </div>
                    <div class="card overflow-hidden">
                        <button type="button" class="faq-toggle w-full flex items-center justify-between p-5 cursor-pointer text-sm font-semibold text-text hover:text-primary transition-colors text-left" aria-expanded="false">
                            <span>Was kostet Ehren-Deal?</span>
                            <svg class="w-4 h-4 text-text-muted transition-transform duration-200 faq-chevron flex-shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                        <div class="faq-content hidden px-5 pb-5 text-sm text-text-secondary leading-relaxed">
                            Das Erstellen von Inseraten ist kostenlos. Bei einem erfolgreichen Verkauf über den Treuhand-Service fällt für den Käufer eine Servicegebühr von 0,50 € und für den Verkäufer eine Verkaufsprovision von 5 % an. Alle Gebühren werden vor Kaufabschluss transparent angezeigt.
                        </div>
                    </div>
                    <div class="card overflow-hidden">
                        <button type="button" class="faq-toggle w-full flex items-center justify-between p-5 cursor-pointer text-sm font-semibold text-text hover:text-primary transition-colors text-left" aria-expanded="false">
                            <span>Wie funktioniert die Verifizierung?</span>
                            <svg class="w-4 h-4 text-text-muted transition-transform duration-200 faq-chevron flex-shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                        <div class="faq-content hidden px-5 pb-5 text-sm text-text-secondary leading-relaxed">
                            Du kannst dich per E-Mail, Telefonnummer und Identitätsprüfung (KYC) verifizieren. Je mehr Verifizierungen, desto höher dein Trust-Score — und desto mehr Vertrauen schenken dir Käufer.
                        </div>
                    </div>
                    <div class="card overflow-hidden">
                        <button type="button" class="faq-toggle w-full flex items-center justify-between p-5 cursor-pointer text-sm font-semibold text-text hover:text-primary transition-colors text-left" aria-expanded="false">
                            <span>Was passiert bei Problemen mit einem Kauf?</span>
                            <svg class="w-4 h-4 text-text-muted transition-transform duration-200 faq-chevron flex-shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                        <div class="faq-content hidden px-5 pb-5 text-sm text-text-secondary leading-relaxed">
                            Unser Support-Team hilft dir weiter. Bei Treuhand-Käufen ist dein Geld geschützt, bis die Situation geklärt ist. Du kannst außerdem jederzeit eine Anzeige melden.
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ═══ Final CTA ═══ -->
        <section class="bg-gradient-to-br from-navy to-[#1B3A5C] text-white py-16">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 class="text-2xl sm:text-3xl font-bold text-white mb-3">Bereit für sichere Deals?</h2>
                <p class="text-white/70 mb-8 max-w-md mx-auto">Kostenlos registrieren. Keine versteckten Gebühren.</p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="/anmelden" class="bg-primary hover:bg-primary-dark text-white px-8 py-3.5 rounded-DEFAULT font-semibold transition-colors">Jetzt registrieren</a>
                    <a href="/sicherheit" class="border border-white/30 text-white px-8 py-3.5 rounded-DEFAULT font-semibold hover:bg-white/10 transition-colors">Mehr erfahren</a>
                </div>
            </div>
        </section>

    </main>
    <Footer />
</BaseLayout>

<script>
    // FAQ Accordion
    document.querySelectorAll('.faq-toggle').forEach((btn) => {
        btn.addEventListener('click', () => {
            const content = btn.nextElementSibling as HTMLElement;
            const chevron = btn.querySelector('.faq-chevron') as HTMLElement;
            const isOpen = !content.classList.contains('hidden');
            if (isOpen) {
                content.classList.add('hidden');
                chevron.style.transform = 'rotate(0deg)';
                btn.setAttribute('aria-expanded', 'false');
            } else {
                content.classList.remove('hidden');
                chevron.style.transform = 'rotate(180deg)';
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });
</script>
```

Key changes from old homepage:
- Navy gradient hero instead of dark blur background
- Trust-first headline: "Kaufen und verkaufen. Mit echtem Schutz." instead of "Handeln mit Ehre"
- Simplified search bar (query + submit) in the hero, advanced filters moved to filter bar
- Trust bar section with letter circles instead of SVG icons
- Listing cards use `.card` class, `.badge-treuhand`, `.badge-verifiziert` components
- "Kein Bild" text instead of SVG placeholder
- Numbered steps (1, 2, 3) instead of icon circles
- Risk Reversal section with minimal SVG checkmarks
- Testimonial cards use `.card` class with initials avatar
- FAQ cards use `.card` class
- Final CTA with navy gradient, trust-focused copy
- Removed geo-location code (can be re-added in Phase 4 search improvements)
- `id="main-content"` for skip-to-content link

- [ ] **Step 2: Verify the build compiles**

```bash
npx astro check 2>&1 | tail -20
```

Expected: No fatal errors. Warnings about unused variables are acceptable.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: rebuild homepage with trust-first architecture"
```

---

### Task 8: Verify and test the complete Phase 1

- [ ] **Step 1: Run the dev server and verify visually**

```bash
npm run dev
```

Open http://localhost:3000 in the browser. Verify:
- Light background, no dark theme
- Inter font loaded (check Network tab for Inter-Variable.woff2)
- No grain texture overlay
- Header: white background, text logo, blue "Anzeige aufgeben" button
- Hero: Navy gradient with "Kaufen und verkaufen. Mit echtem Schutz."
- Trust bar: three items with colored circles
- Listing cards: white cards with green/blue badges
- Footer: Navy background with trust bar above

- [ ] **Step 2: Run existing tests**

```bash
npm test 2>&1 | tail -20
```

Note any failures. The unit tests in `src/__tests__/unit.test.ts` may need updating if they reference old class names.

- [ ] **Step 3: Final commit with all remaining changes**

If any files were missed or need small fixes:

```bash
git add -A
git commit -m "fix: Phase 1 polish — resolve remaining styling issues"
```

---

## Obsidian Hub Creation (parallel task)

After Phase 1 code is complete, create the Ehren-Deal hub in the Obsidian vault. This is documented in the spec section 7 and should be done as a separate task after the code work.
