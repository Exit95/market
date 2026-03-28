# Ehren-Deal: Trust-First Redesign — Design Spec

**Datum:** 2026-03-28
**Status:** Entwurf
**Scope:** Systematische Überarbeitung von ehren-deal.de — Design, UX, Features, Performance

---

## 1. Vision & Positionierung

**Mission:** Ehren-Deal ist der sicherste C2C-Marktplatz Deutschlands. Der Treuhand-Schutz macht den Unterschied zu Kleinanzeigen.

**Benchmark:** Kleinanzeigen.de — aber mit echtem Käuferschutz, besserem Design und Vertrauen als Kern-Erlebnis.

**Zielgruppe:** Privatpersonen in Deutschland, die gebrauchte Waren kaufen und verkaufen. Versand ist Standard, lokale Abholung optional.

**Marken-Archetyp:** Der Beschützer (The Caregiver)
- Kernmotivation: Anderen helfen und sie beschützen
- Markenstimme: Warmherzig, fürsorgend, zuverlässig, geduldig
- Werte: Fürsorge, Sicherheit, Vertrauen, Fairness
- Begründung (Vault: Brand Archetypes): Der Beschützer spricht das Sicherheitsbedürfnis an (Maslow Stufe 2). Treuhand-Schutz IST Beschützer-DNA. Kleinanzeigen hat keinen Beschützer — das ist die Lücke.

**Design-Prinzipien:**
1. Vertrauen durch Klarheit — kein Bling, keine Dekoration, keine überflüssigen Icons
2. Typografie und Whitespace tragen die Kommunikation
3. Farbe hat Bedeutung — jede Farbe transportiert eine psychologische Botschaft
4. Premium aber zugänglich — keine Schwellenangst, jeder fühlt sich willkommen
5. Jede UI-Entscheidung ist psychologisch begründbar (Vault-Referenz)

---

## 2. Design-System

### 2.1 Farbpalette

Das aktuelle Dark-Gold-Theme (#0a0a0b Hintergrund, #c8973a Gold) wird vollständig ersetzt. Begründung: Dunkel wirkt unbewusst "shady" bei einem Marktplatz wo Vertrauen das Kernversprechen ist. Gold wirkt nach "Bling" statt nach Seriosität.

| Token | Hex | Verwendung | Psychologie-Basis |
|-------|-----|------------|-------------------|
| `primary` | `#1B65A6` | CTAs, Links, Hauptaktionen | Blau = Vertrauen, Seriosität (Vault: Farbpsychologie 14.1) |
| `primary-light` | `#E3F2FD` | Badge-Hintergründe, Hover-States | Sanftes Blau, nicht aufdringlich |
| `success` | `#22A06B` | Treuhand-Badge, Verifiziert, Bestätigungen | Grün = Sicherheit, "alles ok" (Vault: Farbpsychologie 14.1) |
| `success-light` | `#E8F5E9` | Success-Badge-Hintergründe | |
| `accent` | `#D97706` | Trust-Score, Elite-Badge, Premium-Elemente | Gold dezent = Qualität, nicht Protz (Vault: Farbpsychologie 14.1) |
| `accent-light` | `#FEF3C7` | Accent-Badge-Hintergründe | |
| `danger` | `#DC2626` | Fehler, Warnungen, Lösch-Aktionen | Rot = Warnung, Aufmerksamkeit |
| `danger-light` | `#FEE2E2` | Fehler-Hintergründe | |
| `background` | `#F8FAFB` | Seitenhintergrund | Weiß = Klarheit, Offenheit (Vault: Farbpsychologie 14.1) |
| `surface` | `#FFFFFF` | Cards, Formulare, Modals | Klare Abgrenzung durch Schatten |
| `navy` | `#1A2332` | Headlines, Footer, Header-Hintergrund | Premium ohne Schwere |
| `text` | `#1A2332` | Fließtext, Headlines | Dunkel genug für 4.5:1 Kontrast |
| `text-secondary` | `#64748B` | Subtexte, Labels, Timestamps | |
| `text-muted` | `#94A3B8` | Platzhalter, deaktivierte Elemente | |
| `border` | `#E5E7EB` | Card-Borders, Trennlinien | |
| `border-light` | `#F1F5F9` | Subtile Trennungen | |

### 2.2 Typografie

Aktuell: Cormorant Garamond (Serif, Headings) + Barlow (Sans, Body). Wird ersetzt.

**Neue Font-Strategie:**
- Headlines: **Inter** — Modern, clean, hochlesbar. Variable Font, self-hosted. (Fallback: system-ui, -apple-system, sans-serif)
- Body: **Inter** — Gleiche Font-Family für Konsistenz. Variable Font deckt alle Gewichte ab.
- Begründung: Serif-Fonts wirken luxuriös aber distanziert. Ein Marktplatz für Privatpersonen braucht Nähe und Klarheit, keine Eleganz. Vault CRO: "Lesbarkeit = min 16px, 1.5 Zeilenabstand, Kontrast."

**Größen-Skala:**

| Token | Größe | Gewicht | Verwendung |
|-------|-------|---------|------------|
| `h1` | 32px | 700 | Seitentitel |
| `h2` | 24px | 700 | Sektions-Headlines |
| `h3` | 20px | 600 | Unter-Headlines |
| `h4` | 16px | 600 | Card-Titel |
| `body` | 16px | 400 | Fließtext |
| `body-sm` | 14px | 400 | Sekundärtext, Metadaten |
| `caption` | 13px | 400 | Timestamps, Hilfstext |
| `label` | 12px | 600 | Uppercase Labels, Badge-Text |

Line-Height: 1.15 für Headlines, 1.6 für Body.

**Font-Loading (Vault: Webdesign-Trends 2026):**
- `font-display: optional` für Body (Zero CLS)
- `font-display: swap` + `size-adjust` für Headlines
- Self-hosted, kein Google Fonts CDN (eliminiert DNS-Lookup)
- Variable Font: ein File statt 4-6 Weight-Files

### 2.3 Kern-Komponenten

**Designregel:** Keine dekorativen Icons oder Emojis. Farbe, Typografie-Gewicht und Whitespace schaffen visuelle Hierarchie. Icons nur wo sie Information transportieren die Text allein nicht kann.

**Buttons:**
- Primary: `#1B65A6` Hintergrund, weiß Text, 10px Radius, 14px/16px Font, großzügiges Padding (14px 28px). Hover: leicht dunkler. Vault: "Abgerundete Ecken wirken freundlicher und klickbarer."
- Secondary: Weiß Hintergrund, `#E5E7EB` Border, `#1A2332` Text. Hover: Light-Grey Hintergrund.
- Success: `#22A06B` Hintergrund für Bestätigungs-Aktionen.
- Danger: `#DC2626` Hintergrund für destruktive Aktionen.
- Ghost: Transparent, nur Text in Primary-Farbe. Für tertiäre Aktionen.

**Listing Card:**
- Weißer Hintergrund, 1px `#E5E7EB` Border, 12px Radius
- Produktbild oben (aspect-ratio: 4/3)
- Badges als farbige Text-Chips (kein Icon): Grüner Chip "Treuhand-Schutz", Blauer Chip "Verifiziert"
- Titel (16px, 600 weight), Ort + Zeit (13px, `text-secondary`), Preis (18px, 700 weight, `primary`)
- Hover: Subtiler Shadow-Lift

**Trust-Badge:**
- Treuhand: `#E8F5E9` Hintergrund, `#22A06B` Text, 6px Radius, 12px Font, 600 weight
- Verifiziert: `#E3F2FD` Hintergrund, `#1B65A6` Text
- Elite/Trusted: `#FEF3C7` Hintergrund, `#D97706` Text
- Kein Icon, nur farbiger Text-Chip

**Seller Card:**
- Avatar: Initialen auf `#E3F2FD` Hintergrund, 48px rund
- Name (16px, 600), Mitglied-seit + Deal-Count (13px, `text-secondary`)
- Trust-Score als Zahl in `#22A06B` (Vault Social Proof 3.3: "Spezifische Zahlen statt runder")

**Info Box (Risk Reversal):**
- `#F0F7FF` Hintergrund, kein Border, 10px Radius
- Für Käuferschutz-Hinweise direkt am CTA
- Link in `primary` Farbe: "Mehr zum Käuferschutz"

**Form Fields:**
- Weiß Hintergrund, 1px `#E5E7EB` Border, 8px Radius, 16px Font
- Focus: `#1B65A6` Border + leichter blauer Box-Shadow
- Error: `#DC2626` Border + `#FEE2E2` Hintergrund + Fehlermeldung in Rot
- Vault CRO: "Klare, hilfreiche Fehlermeldungen"

### 2.4 Was entfernt wird

- Grain-Texture Overlay (CSS noise) — unruhig, ablenkend
- Glass-Morphism / `backdrop-filter: blur()` Panels — lenkt ab, wirkt nach "Crypto-App"
- Gold als Primärfarbe — nur noch als dezenter Akzent für Elite-Status
- Cormorant Garamond Serif-Font — zu luxuriös für C2C-Marktplatz
- Barlow Condensed Uppercase Labels — zu aggressiv
- Custom Select-Arrow Styling — Standard reicht
- Dunkelgrauer/schwarzer Hintergrund überall — komplett zu Light

---

## 3. Seitenarchitektur

### 3.1 Homepage

Reihenfolge basiert auf Vault: Landing Page Anatomie (CRO-Notiz).

**Sektion 1 — Hero:**
- Dunkles Navy-Gradient als Hintergrund (einziger dunkler Bereich der Seite)
- Headline: "Kaufen und verkaufen. Mit echtem Schutz." (Vault: Value Proposition in 5 Sek verständlich)
- Sub-Headline: "Der Marktplatz mit Treuhand-Zahlung. Dein Geld ist sicher, bis du zufrieden bist."
- Suchleiste prominent
- Trust-Signale als Text unter der Suche: "Treuhand-Schutz", "Verifizierte Nutzer", "Digitaler Handschlag" — als Text, keine Icons
- Ein CTA pro Bereich (Vault CRO-Killer #4: Paradox of Choice)

**Sektion 2 — Trust Bar:**
- Helles Blau (`#F0F7FF`) Hintergrund
- 3 Trust-Säulen nebeneinander: Geld-zurück-Garantie, Verifizierte Identitäten, Trust-Score System
- Jede Säule: Farbiger Kreis (Green/Blue/Gold) + Titel + Kurztext
- Vault Trust 8.1: "Visuelle Trust-Signale" + 8.3: "Risk Reversal"
- 3 Elemente = magische Zahl (Vault: Paradox of Choice / Iyengar)

**Sektion 3 — Kategorien:**
- Überschrift "Kategorien"
- 9 Kategorie-Pills als Text-Chips auf `#F8FAFB` Hintergrund mit Border
- Kein Emoji/Icon pro Kategorie — nur Text, ggf. ein einzelnes dezentes Piktogramm wenn nötig

**Sektion 4 — Neue Inserate:**
- Überschrift "Neue Inserate" + Link "Alle ansehen"
- Grid: 3-4 Listing Cards (responsive: 2 auf Tablet, 1 auf Mobile)
- Cards im neuen Design (weiß, Badges, klarer Preis)

**Sektion 5 — So funktioniert's:**
- 3 Schritte nebeneinander, zentriert
- Schritt 1: "Inserat finden" — Schritt 2: "Sicher bezahlen" — Schritt 3: "Deal bestätigen"
- Farbige Kreise als Schritt-Nummern (1, 2, 3), kein Icon
- Vault: Micro-Commitments 7.2 (Fortschrittsbalken), Fogg Model (Facilitator bei niedriger Fähigkeit)

**Sektion 6 — Risk Reversal Block:**
- Headline: "Dein Geld ist sicher. Immer."
- 4 Checkmarks als Liste: Geld-zurück-Garantie, Verifizierte Verkäufer, Sichere Zahlung, Streitfall-Lösung
- Checkmark als Textzeichen oder minimales SVG, nicht als Emoji
- Vault Trust 8.3: "Je radikaler die Garantie, desto stärker der Effekt"

**Sektion 7 — Finaler CTA:**
- Dunkles Navy-Gradient (konsistent mit Hero)
- "Bereit für sichere Deals?" + "Kostenlos registrieren. Keine versteckten Gebühren."
- Primary + Secondary CTA nebeneinander
- Vault: CTA am Seitenende = +70% Conversions, "Kostenlos" = Fähigkeit erhöhen (Fogg), Transparenz-Paradox

### 3.2 Listing-Detailseite (/listing/[id])

Die wichtigste Conversion-Seite.

**Layout:** 2-Spalten auf Desktop (Bilder links 55%, Details rechts 45%). 1-Spalte auf Mobile.

**Oben:** Breadcrumb-Navigation (Startseite > Kategorie > Titel). Vault SEO: BreadcrumbList Schema.

**Linke Spalte:**
- Großes Produktbild mit Thumbnail-Leiste darunter
- Beschreibung unterhalb der Bilder

**Rechte Spalte (Sticky auf Desktop):**
- Badges: Treuhand-Schutz (grün), Verifiziert (blau) — als Text-Chips
- Titel (28px, 700)
- Kurzbeschreibung (14px, `text-secondary`)
- Preis groß (32px, 700, `primary`) + Treuhand-Gebühr + Versandkosten transparent
- Primary CTA: "Jetzt sicher kaufen"
- Secondary CTA: "Nachricht schreiben"
- Risk Reversal Info-Box direkt unter CTAs: "Dein Kauf ist geschützt — Zahlung wird erst freigegeben wenn du den Erhalt bestätigst."
- Details-Grid: Zustand, Kategorie, Standort, Eingestellt-Datum
- Seller Card: Avatar + Name + Mitglied-seit + Deals + Trust-Score

**Psychologie:** Vault CRO-Killer #7 (keine versteckten Kosten), Trust 8.3 (Risk Reversal am Entscheidungspunkt), Social Proof 3.3 (spezifische Trust-Score-Zahl).

### 3.3 Auth-Seiten (/anmelden)

**Login-Tab:**
- E-Mail + Passwort Felder
- Primary CTA: "Anmelden"
- Link: "Passwort vergessen?"
- Minimal, keine Ablenkung

**Register-Tab:**
- Multi-Step-Formular (Vault: Micro-Commitments 7.2 — "86% höhere Conversion als Single-Page")
- Schritt 1: Name + E-Mail (niedrige Hürde)
- Schritt 2: Passwort festlegen
- Schritt 3: Optional: Telefon + Verifizierung
- Fortschrittsbalken: "Schritt 1 von 3" (Vault: Zeigarnik-Effekt)

### 3.4 Inserat erstellen (/inserat-erstellen)

Bestehender 4-Step-Wizard bleibt, wird visuell überarbeitet:
- Schritt 1: Kategorie auswählen
- Schritt 2: Titel, Beschreibung, Preis, Zustand
- Schritt 3: Fotos hochladen (Drag & Drop)
- Schritt 4: Vorschau + Veröffentlichen

**Verbesserungen:**
- Fortschrittsbalken mit Schritt-Nummern (Vault: Zeigarnik-Effekt, Gamification 9.2)
- Bessere Formular-Validierung mit hilfreichen Fehlermeldungen
- Treuhand-Option erklären: was es bedeutet, warum es sich lohnt
- Vorschau zeigt das Inserat exakt so wie Käufer es sehen

### 3.5 Dashboard

**Meine Inserate (/dashboard/listings):**
- Tabelle/Card-Ansicht: Bild-Thumbnail + Titel + Status + Preis + Aufrufe + Aktionen
- Status als farbiger Text-Chip (Aktiv=grün, Reserviert=blau, Verkauft=grau)

**Meine Deals (/dashboard/deals):**
- Cards mit Status-Timeline (visueller Fortschrittsbalken statt Textliste)
- Status: Bezahlt > Versendet > Empfangen > Abgeschlossen
- Klare nächste Aktion pro Deal hervorgehoben

### 3.6 Checkout (/checkout/[id])

- Clean, ablenkungsfrei
- Links: Zusammenfassung (Produktbild, Titel, Preis, Treuhand-Gebühr, Versand, Gesamt)
- Rechts: Stripe Payment Element
- Trust-Hinweis: "Dein Geld wird erst freigegeben wenn du den Erhalt bestätigst"
- Bestätigungsseite mit klaren nächsten Schritten (Vault CRO: "Unklare nächste Schritte = Friction")

### 3.7 Header & Footer

**Header:**
- Links: Logo (Text "Ehren-Deal", kein Spinner/Animation)
- Mitte: Navigation — Startseite, Kategorien, Sicherheit
- Rechts: Suchfeld (collapsed auf Mobile), Login/Registrieren oder User-Dropdown
- Weiß/Surface Hintergrund, subtiler Bottom-Border
- Sticky, aber nicht aufdringlich

**Footer:**
- Navy Hintergrund (`#1A2332`), weiß Text
- Trust-Bar wiederholen (Konsistenz)
- 4 Spalten: Marke, Für Käufer, Für Verkäufer, Unternehmen
- Legal-Links: AGB, Datenschutz, Impressum

### 3.8 Weitere Seiten

Alle folgenden Seiten folgen dem gleichen Design-System (Light Theme, Trust Blue CTAs, keine dekorativen Icons):
- `/kategorien` — Grid-Ansicht aller Kategorien mit Listing-Count
- `/sicherheit` — Erklärung des Treuhand-Systems, Verifizierung, Käuferschutz
- `/sicher-kaufen` — Buyer Protection Guide
- `/kontakt` — Kontaktformular (minimal: Name, E-Mail, Nachricht)
- `/merkliste` — Gespeicherte Inserate als Listing-Grid
- `/profil` — Eigenes Profil: Trust-Score, Verifizierungs-Fortschritt, Inserate, Deals
- `/profil/[id]` — Öffentliches Profil anderer Nutzer
- `/nachrichten` — Chat-Inbox im neuen Design
- `/agb`, `/datenschutz`, `/impressum` — Legal-Seiten, clean Typografie
- `/404` — Freundliche 404-Seite mit Suchleiste

---

## 4. Neue Features

### 4.1 Bewertungssystem

Aktuell fehlt komplett. Wird nach abgeschlossenem Deal freigeschaltet.

- Sterne (1-5) + Freitext-Kommentar
- Nur nach COMPLETED-Deal möglich (keine Fake-Reviews)
- Öffentlich auf Profil sichtbar
- Vault Social Proof 3.1: "Testimonials mit Foto, Name = 3x stärker als anonyme"
- Vault Transparenz-Paradox: "4.7/5 wirkt glaubwürdiger als 5.0" — Durchschnitt berechnen und anzeigen

**Datenmodell-Erweiterung:**
```
model Review {
  id          String   @id @default(cuid())
  dealId      String   @unique
  reviewerId  String
  revieweeId  String
  rating      Int      // 1-5
  comment     String?
  createdAt   DateTime @default(now())
}
```

### 4.2 Gamification (Trust-Level-System)

Das bestehende Trust-Score-System (NEW > BASIC > VERIFIED > TRUSTED > ELITE) wird visuell sichtbar gemacht.

- Profil-Seite: Fortschrittsbalken "Noch X Deals bis [nächstes Level]" (Vault: Zeigarnik-Effekt)
- Profil-Vollständigkeit: "Dein Profil ist 72% komplett" (Vault: Gamification 9.2)
- Level-Badge auf Listing-Cards und Profil (nur Text-Chip, kein Icon)
- Vorteile pro Level sichtbar machen: "Als Trusted-Verkäufer: höhere Sichtbarkeit, niedrigere Gebühren"
- Vault Hook-Modell: Trigger (Badge-Benachrichtigung) > Action (Profil vervollständigen) > Reward (neues Level) > Investment (mehr Deals)

### 4.3 Erweiterte Suche & Entdecken

- Filter-Panel: Preis (min/max), Zustand, Entfernung/PLZ, Nur-Treuhand, Nur-Verifiziert
- Sortierung: Relevanz, Preis aufsteigend/absteigend, Neueste
- Algolia Full-Text-Suche aktivieren (Integration existiert bereits in `src/lib/algolia.ts`)
- Gespeicherte Suchen mit Benachrichtigungen (spätere Phase)

---

## 5. Performance & SEO

### 5.1 Core Web Vitals (Vault: Webdesign-Trends 2026)

| Metrik | Ziel | Maßnahme |
|--------|------|----------|
| LCP | < 2.5s | Hero-Images preloaden, AVIF + WebP mit `<picture>`, `fetchpriority="high"` auf LCP-Image |
| INP | < 200ms | Non-critical JS defer, Long Tasks aufbrechen |
| CLS | < 0.1 | Explizite `width`/`height` auf alle Bilder, `font-display: optional` für Body |

Vault: "Jede 100ms Verbesserung = +1% Conversions", "Ladezeit 1s > 5s = +90% Bounce"

### 5.2 Bildoptimierung

- AVIF als Primärformat (94.7% Support, 50%+ kleiner als JPEG)
- WebP als Fallback
- Astros `<Image>` Komponente nutzen
- Lazy-Load für Below-Fold, Eager-Load für LCP

### 5.3 Fonts

- Self-hosted Variable Font (Inter)
- `font-display: optional` für Body (Zero CLS)
- `font-display: swap` + `size-adjust` für Headlines
- Nur Above-the-Fold Fonts preloaden

### 5.4 Structured Data (Vault: SEO 2026)

- `WebSite` mit `SearchAction` auf Homepage
- `Product` auf Listing-Detailseiten (name, price, condition, seller)
- `BreadcrumbList` auf allen Seiten mit Breadcrumbs
- `FAQPage` auf der Sicherheits-Seite
- `Organization` im Footer/Global
- Vault: "Schema-Markup erhöht Rich-Snippet-Chancen um 40-60%"

### 5.5 Accessibility (Vault: WCAG 2.2)

- Farbkontrast: 4.5:1 für Body-Text, 3:1 für Large Text — alle neuen Farben erfüllen das
- Focus-Indikatoren: 2px+ Outline in `primary`, 3:1 Kontrast
- Target Size: Alle interaktiven Elemente min. 24x24px
- Heading-Hierarchie: h1 > h2 > h3, kein Überspringen
- Alt-Texte auf alle Produktbilder
- Skip-to-Content Link
- ARIA Labels auf Icon-Only Buttons
- Vault: "95.9% aller Websites fallen durch — wir nicht"

---

## 6. Phasen-Plan

### Phase 1 — Design-System & Homepage (Fundament)
- Tailwind Config neu: Farben, Fonts, Spacing, Radius
- global.css: Grain/Glass/Dark entfernen, neue Komponenten-Klassen
- Header & Footer redesignen
- Homepage komplett neu bauen
- BaseLayout.astro anpassen

### Phase 2 — Kern-Seiten Redesign
- Listing-Detailseite (/listing/[id])
- Auth-Seiten (/anmelden, Passwort-Reset)
- Inserat erstellen (/inserat-erstellen)
- Profil-Seiten (/profil, /profil/[id])
- Kategorie-Übersicht (/kategorien)

### Phase 3 — Deal-Flow & Checkout
- Checkout-Seite (/checkout/[id])
- Deal-Detail mit Status-Timeline
- Dashboard: Meine Inserate + Meine Deals
- Bestätigungsseiten mit nächsten Schritten

### Phase 4 — Neue Features
- Bewertungssystem (Review Model + UI)
- Trust-Level Gamification (Fortschrittsbalken, Level-Badges)
- Erweiterte Suche mit Filtern
- Gespeicherte Suchen / Merkliste verbessern

### Phase 5 — Performance, SEO & Polish
- Core Web Vitals optimieren (Bilder, Fonts, JS)
- Structured Data implementieren
- WCAG 2.2 AA Audit und Fixes
- Open Graph Tags für Social Sharing
- Sitemap + robots.txt
- 404-Seite

---

## 7. Obsidian-Vault: Ehren-Deal Hub

Neuer Ordner `Projekte/Ehren-Deal/` im bestehenden Danapfel Digital Vault.

### Struktur

```
Projekte/Ehren-Deal/
  Ehren-Deal.md                    — Hub-Seite, Übersicht, Links zu allem
  Design/
    Markenidentität.md             — Archetyp, Tonalität, Farben, Typografie
    Farbpalette.md                 — Alle Farben mit Vault-Begründungen
    Komponenten.md                 — Cards, Badges, Buttons, Forms
    Seitenarchitektur.md           — Jede Seite: Aufbau, CRO-Prinzipien
  Psychologie/
    Trust-Strategie.md             — Wie Trust Engineering auf ED angewandt wird
    Customer-Journey.md            — Käufer + Verkäufer Journey
    Conversion-Map.md              — Welches Vault-Prinzip wo auf der Seite wirkt
    Gamification-Plan.md           — Trust-Levels, Fortschritt, Hooks
  Technik/
    Architektur.md                 — Astro, Prisma, APIs, Integrationen
    Performance.md                 — Core Web Vitals, Bildoptimierung, Fonts
    SEO.md                         — Structured Data, Sitemap, OG Tags
  Roadmap/
    Phasen-Übersicht.md            — Die 5 Phasen mit Status-Tracking
    Wettbewerb.md                  — Kleinanzeigen vs. Ehren-Deal Vergleich
```

### Vault-Vernetzung

Jede Ehren-Deal-Notiz verlinkt zurück zum relevanten Vault-Wissen:
- Trust-Strategie.md → [[08 - Trust Engineering]], [[03 - Social Proof Manipulation]], [[15 - Ethik, Recht & Grenzen]]
- Customer-Journey.md → [[Marketing/Customer Journey Mapping]], [[07 - Micro-Commitments]], [[09 - Gamification]]
- Conversion-Map.md → [[Marketing/CRO]], [[01 - Kognitive Verzerrungen]], [[14 - Farb- und Formpsychologie]]
- Markenidentität.md → [[Marketing/Brand Archetypes]], [[Farbwirkung-Tabelle]], [[13 - Copywriting-Formeln]]
- Performance.md → [[Wissen/Webdesign-Trends 2025-2026]], [[Business/SEO-Checkliste]]

---

## 8. Technische Rahmenbedingungen

### Was bleibt
- Astro 5 als Framework (SSR via @astrojs/node)
- Prisma als ORM + PostgreSQL
- Lucia Auth für Sessions
- Stripe für Payments
- Ably für Real-Time Chat
- React für interaktive Islands (ChatApp, HandshakeApp)
- Bestehende API-Routen (51 Endpoints)
- Bestehende Prisma-Modelle (15 Models + Review-Erweiterung)

### Was sich ändert
- Tailwind Config: komplett neue Farben, Fonts, Spacing
- global.css: Grain, Glass, Dark-Theme-Klassen entfernt, neue Komponenten
- Alle .astro-Seiten: Light-Theme, neue Komponenten
- Header.astro + Footer.astro: Redesign
- BaseLayout.astro: Meta-Tags, Fonts, OG-Tags
- Bilder: AVIF/WebP-Optimierung

### Was neu hinzukommt
- Review Model (Prisma) + API-Endpoints
- Structured Data (JSON-LD in BaseLayout)
- Erweiterte Such-Filter UI
- Trust-Level Fortschritts-UI
