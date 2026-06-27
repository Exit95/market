# Leistungstausch Phase 1 (MVP) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Leistungstausch MVP — users can create, browse, search, and filter service-exchange listings in a visually distinct area of ehren-deal.de.

**Architecture:** Parallel model alongside existing marketplace. New Prisma models (`ServiceCategory`, `ServiceListing`, `ServiceListingSoughtCategory`, `ServiceListingImage`, `ServiceListingReport`), new API routes under `/api/leistungstausch/`, new Astro pages under `/leistungstausch/`, new React components for interactive forms. Shared infrastructure: User model, Auth (Lucia), S3 uploads, Algolia, existing trust-score system.

**Tech Stack:** Astro 5 SSR, React 19, Tailwind CSS 3.4, Prisma 6 (MySQL), Zod, Algolia, S3/MinIO

**Spec:** `docs/superpowers/specs/2026-04-06-leistungstausch-design.md`

---

## File Map

### New Files

| File | Responsibility |
|---|---|
| `prisma/seed-service-categories.ts` | Seed script for 12 service categories |
| `src/lib/service-validation.ts` | Zod schemas for all Leistungstausch inputs |
| `src/lib/service-content-filter.ts` | Discrimination + money/goods detection filter pipeline |
| `src/data/service-categories.ts` | Static category data for fallback/SSR |
| `src/pages/api/leistungstausch/categories.ts` | GET service categories |
| `src/pages/api/leistungstausch/listings/index.ts` | GET (search/filter) + POST (create) service listings |
| `src/pages/api/leistungstausch/listings/[id].ts` | GET (detail) + PUT (edit) + DELETE service listings |
| `src/pages/api/leistungstausch/reports.ts` | POST report a service listing |
| `src/components/leistungstausch/ServiceCard.astro` | Listing card for grid display |
| `src/components/leistungstausch/ServiceHero.astro` | Hero section with search + CTA |
| `src/components/leistungstausch/ServiceCategoryBar.astro` | Horizontal scrolling category bar |
| `src/components/leistungstausch/ServiceFilters.astro` | Filter bar (primary + secondary) |
| `src/components/leistungstausch/ServiceDetail.astro` | Detail page main content area |
| `src/components/leistungstausch/ServiceProviderCard.astro` | Sidebar provider info card |
| `src/components/leistungstausch/ServiceCreateWizard.tsx` | React 3-step creation wizard |
| `src/pages/leistungstausch/index.astro` | Overview page with search, filters, card grid |
| `src/pages/leistungstausch/erstellen.astro` | Create listing page (hosts wizard) |
| `src/pages/leistungstausch/angebot/[id].astro` | Listing detail page |

### Modified Files

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add ServiceCategory, ServiceListing, ServiceListingSoughtCategory, ServiceListingImage, ServiceListingReport models + enums + User relations |
| `tailwind.config.mjs` | Add teal color palette |
| `src/styles/global.css` | Add leistungstausch-specific CSS component classes |
| `src/components/Header.astro` | Add "Leistungstausch" nav link |
| `src/pages/index.astro` | Add teal teaser banner section |

---

## Task 1: Prisma Schema — Enums and ServiceCategory Model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add Leistungstausch enums to schema.prisma**

Add after the existing `FraudSeverity` enum (around line 110):

```prisma
// ─── Leistungstausch Enums ───────────────────────────────────────────────────

enum ServiceEffort {
  UNTER_1_STUNDE
  EIN_BIS_DREI_STUNDEN
  DREI_BIS_ACHT_STUNDEN
  MEHRERE_TAGE
  FORTLAUFEND
}

enum ServiceLocationType {
  VOR_ORT
  REMOTE
  BEIDES
}

enum ServiceExperienceLevel {
  ANFAENGER
  FORTGESCHRITTEN
  PROFI
}

enum ServiceListingStatus {
  ACTIVE
  PAUSED
  MATCHED
  COMPLETED
  EXPIRED
  REMOVED
}

enum ServiceReportReason {
  NICHT_DIENSTLEISTUNG
  DISKRIMINIERUNG
  SPAM
  BETRUG
  UNANGEMESSEN
  DUPLIKAT
  SONSTIGES
}
```

- [ ] **Step 2: Add ServiceCategory model**

Add after the existing `Category` model block (after line 132):

```prisma
// ─── Service Category (Leistungstausch) ──────────────────────────────────────

model ServiceCategory {
  id           String   @id @default(cuid())
  name         String
  slug         String   @unique
  icon         String?
  description  String?
  position     Int      @default(0)
  listingCount Int      @default(0)
  createdAt    DateTime @default(now())

  offeredListings ServiceListing[]               @relation("OfferedCategory")
  soughtListings  ServiceListingSoughtCategory[]

  @@index([slug])
  @@map("service_categories")
}
```

- [ ] **Step 3: Run prisma format to validate syntax**

Run: `cd /home/exit/Dokumente/Kunden_Projekte_UVM/market-Melvin_-nderungen && npx prisma format`
Expected: "Formatted prisma/schema.prisma" with no errors

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(leistungstausch): add service enums and ServiceCategory model"
```

---

## Task 2: Prisma Schema — ServiceListing and Related Models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add ServiceListing model**

Add after the `ServiceCategory` model:

```prisma
// ─── Service Listing (Leistungstausch) ───────────────────────────────────────

model ServiceListing {
  id                 String                @id @default(cuid())
  title              String
  offeredDescription String                @db.Text
  soughtDescription  String                @db.Text
  effort             ServiceEffort
  locationType       ServiceLocationType
  city               String?
  postalCode         String?
  latitude           Float?
  longitude          Float?
  availability       String?               @db.Text // JSON array: ["WERKTAGS","ABENDS"]
  experienceLevel    ServiceExperienceLevel?
  requirements       String?               @db.Text
  expiresAt          DateTime
  status             ServiceListingStatus  @default(ACTIVE)
  viewCount          Int                   @default(0)
  createdAt          DateTime              @default(now())
  updatedAt          DateTime              @updatedAt

  userId             String
  user               User                  @relation("UserServiceListings", fields: [userId], references: [id])
  offeredCategoryId  String
  offeredCategory    ServiceCategory       @relation("OfferedCategory", fields: [offeredCategoryId], references: [id])
  soughtCategories   ServiceListingSoughtCategory[]
  images             ServiceListingImage[]
  reports            ServiceListingReport[]

  @@index([userId])
  @@index([offeredCategoryId])
  @@index([status, createdAt])
  @@index([latitude, longitude])
  @@map("service_listings")
}
```

- [ ] **Step 2: Add ServiceListingSoughtCategory junction model**

```prisma
// ─── Service Listing ↔ Sought Category (M:N) ────────────────────────────────

model ServiceListingSoughtCategory {
  id               String          @id @default(cuid())
  serviceListingId String
  serviceListing   ServiceListing  @relation(fields: [serviceListingId], references: [id], onDelete: Cascade)
  categoryId       String
  category         ServiceCategory @relation(fields: [categoryId], references: [id])

  @@unique([serviceListingId, categoryId])
  @@index([categoryId])
  @@map("service_listing_sought_categories")
}
```

- [ ] **Step 3: Add ServiceListingImage model**

```prisma
// ─── Service Listing Image ───────────────────────────────────────────────────

model ServiceListingImage {
  id               String         @id @default(cuid())
  serviceListingId String
  serviceListing   ServiceListing @relation(fields: [serviceListingId], references: [id], onDelete: Cascade)
  url              String
  position         Int            @default(0)
  createdAt        DateTime       @default(now())

  @@index([serviceListingId])
  @@map("service_listing_images")
}
```

- [ ] **Step 4: Add ServiceListingReport model**

```prisma
// ─── Service Listing Report ──────────────────────────────────────────────────

model ServiceListingReport {
  id               String              @id @default(cuid())
  serviceListingId String
  serviceListing   ServiceListing      @relation(fields: [serviceListingId], references: [id])
  reporterId       String
  reporter         User                @relation("UserServiceListingReports", fields: [reporterId], references: [id])
  reason           ServiceReportReason
  description      String?             @db.Text
  status           String              @default("OPEN")
  createdAt        DateTime            @default(now())

  @@unique([serviceListingId, reporterId])
  @@index([serviceListingId])
  @@map("service_listing_reports")
}
```

- [ ] **Step 5: Add Leistungstausch relations to User model**

In the `User` model, add these lines after the existing `reviewsReceived` relation (around line 182):

```prisma
  // Leistungstausch
  serviceListings       ServiceListing[]       @relation("UserServiceListings")
  serviceListingReports ServiceListingReport[] @relation("UserServiceListingReports")
```

- [ ] **Step 6: Run prisma format**

Run: `npx prisma format`
Expected: "Formatted prisma/schema.prisma" with no errors

- [ ] **Step 7: Generate Prisma client**

Run: `npx prisma generate`
Expected: "Generated Prisma Client" success message

- [ ] **Step 8: Create and run migration**

Run: `npx prisma db push`
Expected: Database schema synced successfully. (Using `db push` because this is a development environment. If production migration is needed, use `prisma migrate dev --name add-leistungstausch-models`)

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(leistungstausch): add ServiceListing, Image, SoughtCategory, Report models"
```

---

## Task 3: Seed Service Categories

**Files:**
- Create: `prisma/seed-service-categories.ts`
- Create: `src/data/service-categories.ts`

- [ ] **Step 1: Create seed script**

Create `prisma/seed-service-categories.ts`:

```typescript
/**
 * prisma/seed-service-categories.ts
 * Seed-Script für Leistungstausch-Kategorien.
 * Ausführen: npx tsx prisma/seed-service-categories.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const serviceCategories = [
  { slug: 'handwerk-reparatur', name: 'Handwerk & Reparatur', icon: '/icons/service/handwerk.svg', description: 'Möbelaufbau, Renovierung, Reparaturen', position: 1 },
  { slug: 'digital-it', name: 'Digital & IT', icon: '/icons/service/digital.svg', description: 'Webdesign, Programmierung, IT-Support', position: 2 },
  { slug: 'haushalt-reinigung', name: 'Haushalt & Reinigung', icon: '/icons/service/haushalt.svg', description: 'Putzen, Aufräumen, Wäsche', position: 3 },
  { slug: 'garten-aussenbereich', name: 'Garten & Außenbereich', icon: '/icons/service/garten.svg', description: 'Rasenmähen, Hecke schneiden, Bepflanzung', position: 4 },
  { slug: 'transport-umzug', name: 'Transport & Umzug', icon: '/icons/service/transport.svg', description: 'Umzugshilfe, Transporte, Entsorgung', position: 5 },
  { slug: 'nachhilfe-bildung', name: 'Nachhilfe & Bildung', icon: '/icons/service/nachhilfe.svg', description: 'Mathe, Sprachen, Musikunterricht', position: 6 },
  { slug: 'kreativ-medien', name: 'Kreativ & Medien', icon: '/icons/service/kreativ.svg', description: 'Fotografie, Videoschnitt, Grafikdesign', position: 7 },
  { slug: 'pflege-betreuung', name: 'Pflege & Betreuung', icon: '/icons/service/pflege.svg', description: 'Kinderbetreuung, Tierbetreuung, Seniorenhilfe', position: 8 },
  { slug: 'buero-verwaltung', name: 'Büro & Verwaltung', icon: '/icons/service/buero.svg', description: 'Steuerhilfe, Schreibarbeiten, Übersetzung', position: 9 },
  { slug: 'sport-fitness', name: 'Sport & Fitness', icon: '/icons/service/sport.svg', description: 'Personal Training, Yoga, Tanzunterricht', position: 10 },
  { slug: 'events-unterhaltung', name: 'Events & Unterhaltung', icon: '/icons/service/events.svg', description: 'DJ, Moderation, Kochen für Events', position: 11 },
  { slug: 'sonstiges', name: 'Sonstiges', icon: '/icons/service/sonstiges.svg', description: 'Alles was nicht in andere Kategorien passt', position: 12 },
];

async function main() {
  console.log('Seeding service categories...');

  for (const cat of serviceCategories) {
    await prisma.serviceCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, description: cat.description, position: cat.position },
      create: cat,
    });
    console.log(`  ✓ ${cat.name}`);
  }

  console.log(`Done. ${serviceCategories.length} service categories seeded.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Create static category data for SSR/fallback**

Create `src/data/service-categories.ts`:

```typescript
/**
 * src/data/service-categories.ts
 * Static service category data for SSR rendering and fallback.
 */

export interface ServiceCategoryData {
  slug: string;
  name: string;
  icon: string;
  description: string;
}

export const serviceCategories: ServiceCategoryData[] = [
  { slug: 'handwerk-reparatur', name: 'Handwerk & Reparatur', icon: '/icons/service/handwerk.svg', description: 'Möbelaufbau, Renovierung, Reparaturen' },
  { slug: 'digital-it', name: 'Digital & IT', icon: '/icons/service/digital.svg', description: 'Webdesign, Programmierung, IT-Support' },
  { slug: 'haushalt-reinigung', name: 'Haushalt & Reinigung', icon: '/icons/service/haushalt.svg', description: 'Putzen, Aufräumen, Wäsche' },
  { slug: 'garten-aussenbereich', name: 'Garten & Außenbereich', icon: '/icons/service/garten.svg', description: 'Rasenmähen, Hecke schneiden, Bepflanzung' },
  { slug: 'transport-umzug', name: 'Transport & Umzug', icon: '/icons/service/transport.svg', description: 'Umzugshilfe, Transporte, Entsorgung' },
  { slug: 'nachhilfe-bildung', name: 'Nachhilfe & Bildung', icon: '/icons/service/nachhilfe.svg', description: 'Mathe, Sprachen, Musikunterricht' },
  { slug: 'kreativ-medien', name: 'Kreativ & Medien', icon: '/icons/service/kreativ.svg', description: 'Fotografie, Videoschnitt, Grafikdesign' },
  { slug: 'pflege-betreuung', name: 'Pflege & Betreuung', icon: '/icons/service/pflege.svg', description: 'Kinderbetreuung, Tierbetreuung, Seniorenhilfe' },
  { slug: 'buero-verwaltung', name: 'Büro & Verwaltung', icon: '/icons/service/buero.svg', description: 'Steuerhilfe, Schreibarbeiten, Übersetzung' },
  { slug: 'sport-fitness', name: 'Sport & Fitness', icon: '/icons/service/sport.svg', description: 'Personal Training, Yoga, Tanzunterricht' },
  { slug: 'events-unterhaltung', name: 'Events & Unterhaltung', icon: '/icons/service/events.svg', description: 'DJ, Moderation, Kochen für Events' },
  { slug: 'sonstiges', name: 'Sonstiges', icon: '/icons/service/sonstiges.svg', description: 'Alles was nicht in andere Kategorien passt' },
];

export const effortLabels: Record<string, string> = {
  UNTER_1_STUNDE: 'Unter 1 Stunde',
  EIN_BIS_DREI_STUNDEN: '1–3 Stunden',
  DREI_BIS_ACHT_STUNDEN: '3–8 Stunden',
  MEHRERE_TAGE: 'Mehrere Tage',
  FORTLAUFEND: 'Fortlaufend',
};

export const locationTypeLabels: Record<string, string> = {
  VOR_ORT: 'Vor Ort',
  REMOTE: 'Remote',
  BEIDES: 'Beides möglich',
};

export const experienceLevelLabels: Record<string, string> = {
  ANFAENGER: 'Anfänger',
  FORTGESCHRITTEN: 'Fortgeschritten',
  PROFI: 'Profi',
};

export const availabilityLabels: Record<string, string> = {
  WERKTAGS: 'Werktags',
  ABENDS: 'Abends',
  WOCHENENDE: 'Wochenende',
  FLEXIBEL: 'Flexibel',
};
```

- [ ] **Step 3: Run seed script**

Run: `cd /home/exit/Dokumente/Kunden_Projekte_UVM/market-Melvin_-nderungen && npx tsx prisma/seed-service-categories.ts`
Expected: 12 categories seeded successfully

- [ ] **Step 4: Commit**

```bash
git add prisma/seed-service-categories.ts src/data/service-categories.ts
git commit -m "feat(leistungstausch): add service category seed script and static data"
```

---

## Task 4: Content Filter — Discrimination + Money/Goods Detection

**Files:**
- Create: `src/lib/service-content-filter.ts`

- [ ] **Step 1: Create the content filter module**

Create `src/lib/service-content-filter.ts`:

```typescript
/**
 * src/lib/service-content-filter.ts
 * Content-Filter-Pipeline für Leistungstausch.
 *
 * Prüft alle Texte auf:
 * 1. Diskriminierung (Hard Block)
 * 2. Geld/Waren-Referenzen (Hard Block)
 * 3. Unzulässige Dienstleistungen (Soft Block → Admin)
 * 4. Qualitätsprobleme (Warnung)
 */

export interface FilterResult {
  passed: boolean;
  level: 'ok' | 'warning' | 'soft_block' | 'hard_block';
  rule: string | null;
  message: string | null;
  flags: string[];
}

// ── 1. Diskriminierung ──────────────────────────────────────────────────────

const DISCRIMINATION_PATTERNS: Array<{ re: RegExp; flag: string }> = [
  // Ethnische / nationale Ausschlüsse
  { re: /\b(nur\s+für\s+deutsche|keine\s+ausl[aä]nder|nur\s+(?:bio-?)?deutsche)\b/i, flag: 'ETHNIC_EXCLUSION' },
  { re: /\b(keine?\s+(?:türk|arab|afrik|asiat|rum[aä]n|bulgar|pol|russ)\w*)\b/i, flag: 'ETHNIC_EXCLUSION' },
  // Religiöse Ausschlüsse
  { re: /\b(keine?\s+(?:muslim|islam|jud|jüd|christ|hindu|buddhist)\w*)\b/i, flag: 'RELIGIOUS_EXCLUSION' },
  { re: /\b(nur\s+(?:für\s+)?(?:christen|muslime|juden))\b/i, flag: 'RELIGIOUS_EXCLUSION' },
  // Antisemitismus (auch kodiert)
  { re: /\b((?:juden|jews?)\s*(?:raus|weg|vergasen))\b/i, flag: 'ANTISEMITISM' },
  { re: /\b((?:(((?:jüd|jew)\w*)\s+(?:kontrolle|verschwörung|lobby))))\b/i, flag: 'ANTISEMITISM' },
  // Rechtsextreme Codes
  { re: /\b(heil\s+hitler|sieg\s+heil|white\s+power|1488|14\s*words)\b/i, flag: 'RIGHTWING_EXTREMISM' },
  { re: /(?:^|\s)(88|1488)(?:\s|$|[.,!?])/, flag: 'RIGHTWING_CODE' },
  // Homophobie / Transphobie
  { re: /\b(keine?\s+(?:schwul|lesb|trans|homo|queer)\w*)\b/i, flag: 'HOMOPHOBIA' },
  { re: /\b(schwuchtel|tunte|transe)\b/i, flag: 'HOMOPHOBIC_SLUR' },
  // Geschlechtsdiskriminierung
  { re: /\b(keine?\s+(?:frauen|männer|weiber)\s+(?:erwünscht|erlaubt|gewollt))\b/i, flag: 'GENDER_DISCRIMINATION' },
  // Altersdiskriminierung
  { re: /\b(keine?\s+(?:alten|senioren|jungen))\b/i, flag: 'AGE_DISCRIMINATION' },
  // Behindertenfeindlichkeit
  { re: /\b(behindert|krüppel|spast|mongo)\b/i, flag: 'ABLEISM' },
  // Rassistische Slurs (Deutsch)
  { re: /\b(neger|kanake?|kümmelt[uü]rk|schlitzauge|zigeuner)\b/i, flag: 'RACIST_SLUR' },
];

// ── 2. Geld / Waren ────────────────────────────────────────────────────────

const MONEY_GOODS_PATTERNS: Array<{ re: RegExp; flag: string }> = [
  // Geld-Referenzen
  { re: /\b(\d+\s*[€$]|[€$]\s*\d+|\d+\s*(?:euro|eur)\b)/i, flag: 'MONEY_REFERENCE' },
  { re: /\b(stundenlohn|bezahlung|vergütung|honorar|gehalt|lohn|entgelt)\b/i, flag: 'PAYMENT_TERM' },
  { re: /\b(vb|verhandlungsbasis|festpreis|preis)\b/i, flag: 'PRICE_TERM' },
  { re: /\b(gegen\s+(?:geld|bezahlung|zahlung))\b/i, flag: 'MONEY_EXCHANGE' },
  // Waren-Referenzen
  { re: /\b(verkauf\w*|zu\s+verkaufen)\b/i, flag: 'SALE_TERM' },
  { re: /\b(wie\s+neu|ovp|originalverpackung?|unbenutzt|neuwertig)\b/i, flag: 'PRODUCT_CONDITION' },
  { re: /\b(versand\s+(?:möglich|inklusive|gegen)|dhl|hermes|dpd)\b/i, flag: 'SHIPPING_REFERENCE' },
  // Zuzahlungen
  { re: /\b(zuzahlung|aufpreis|differenz|aufzahlung|plus\s+\d+)\b/i, flag: 'SURCHARGE' },
  { re: /\b(gegen\s+(?:aufpreis|aufzahlung|zuzahlung))\b/i, flag: 'SURCHARGE_EXCHANGE' },
];

// ── 3. Unzulässige Dienstleistungen ────────────────────────────────────────

const ILLEGAL_SERVICE_PATTERNS: Array<{ re: RegExp; flag: string }> = [
  { re: /\b(sex\w*\s+(?:dienst|service|leistung|angebot|massage))\b/i, flag: 'SEXUAL_SERVICE' },
  { re: /\b(erotik|escort|intim|happy\s+end)\b/i, flag: 'SEXUAL_SERVICE' },
  { re: /\b(drogen|gras|weed|kokain|mdma|ecstasy)\b/i, flag: 'ILLEGAL_SUBSTANCE' },
  { re: /\b(waffen|schusswaffe|munition|sprengstoff)\b/i, flag: 'ILLEGAL_WEAPON' },
  { re: /\b(fälsch\w*|gefälscht\w*|fake\s+(?:ausweis|führerschein|dokument))\b/i, flag: 'FORGERY' },
  { re: /\b(schwarzarbeit|ohne\s+rechnung|steuerfrei\s+(?:arbeit|leistung))\b/i, flag: 'TAX_EVASION' },
];

// ── 4. Qualität ─────────────────────────────────────────────────────────────

const QUALITY_PATTERNS: Array<{ re: RegExp; flag: string }> = [
  { re: /^(mache alles|kann alles|bin flexibel|biete hilfe)$/i, flag: 'TOO_VAGUE' },
  { re: /(.)\1{5,}/i, flag: 'SPAM_REPETITION' }, // "aaaaaa"
  { re: /(test|asdf|lorem ipsum|xxx)/i, flag: 'TEST_CONTENT' },
];

/**
 * Run the full content filter pipeline on a text string.
 * Checks in order: discrimination → money/goods → illegal → quality.
 * Returns on first hard/soft block found.
 */
export function filterServiceContent(text: string): FilterResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { passed: true, level: 'ok', rule: null, message: null, flags: [] };
  }

  // 1. Discrimination — Hard Block
  for (const p of DISCRIMINATION_PATTERNS) {
    if (p.re.test(trimmed)) {
      return {
        passed: false,
        level: 'hard_block',
        rule: 'DISKRIMINIERUNG',
        message: 'Dieser Inhalt verstößt gegen unsere Antidiskriminierungsrichtlinien und kann nicht veröffentlicht werden.',
        flags: [p.flag],
      };
    }
  }

  // 2. Money/Goods — Hard Block
  for (const p of MONEY_GOODS_PATTERNS) {
    if (p.re.test(trimmed)) {
      return {
        passed: false,
        level: 'hard_block',
        rule: 'KEIN_GELD_KEINE_WARE',
        message: 'Im Leistungstausch sind keine Geldbeträge, Preise oder Warenangebote erlaubt. Hier geht es ausschließlich um Dienstleistung gegen Dienstleistung.',
        flags: [p.flag],
      };
    }
  }

  // 3. Illegal services — Soft Block
  for (const p of ILLEGAL_SERVICE_PATTERNS) {
    if (p.re.test(trimmed)) {
      return {
        passed: false,
        level: 'soft_block',
        rule: 'UNZULAESSIGE_DIENSTLEISTUNG',
        message: 'Dieses Angebot wurde zur Überprüfung markiert und wird von unserem Team geprüft.',
        flags: [p.flag],
      };
    }
  }

  // 4. Quality — Warning (still passes)
  const qualityFlags: string[] = [];
  for (const p of QUALITY_PATTERNS) {
    if (p.re.test(trimmed)) {
      qualityFlags.push(p.flag);
    }
  }
  if (qualityFlags.length > 0) {
    return {
      passed: true,
      level: 'warning',
      rule: 'QUALITAET',
      message: 'Dein Text könnte detaillierter sein. Je genauer du beschreibst, desto bessere Vorschläge bekommst du.',
      flags: qualityFlags,
    };
  }

  return { passed: true, level: 'ok', rule: null, message: null, flags: [] };
}

/**
 * Run filter on multiple text fields at once.
 * Returns the first blocking result, or the worst warning, or ok.
 */
export function filterServiceListing(fields: {
  title: string;
  offeredDescription: string;
  soughtDescription: string;
  requirements?: string;
}): FilterResult {
  const texts = [
    { name: 'Titel', text: fields.title },
    { name: 'Leistungsbeschreibung', text: fields.offeredDescription },
    { name: 'Gegenleistung', text: fields.soughtDescription },
  ];
  if (fields.requirements) {
    texts.push({ name: 'Voraussetzungen', text: fields.requirements });
  }

  let worstWarning: FilterResult | null = null;

  for (const { name, text } of texts) {
    const result = filterServiceContent(text);
    if (result.level === 'hard_block' || result.level === 'soft_block') {
      return {
        ...result,
        message: `${name}: ${result.message}`,
      };
    }
    if (result.level === 'warning' && !worstWarning) {
      worstWarning = { ...result, message: `${name}: ${result.message}` };
    }
  }

  return worstWarning ?? { passed: true, level: 'ok', rule: null, message: null, flags: [] };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/service-content-filter.ts
git commit -m "feat(leistungstausch): add content filter for discrimination, money/goods, illegal services"
```

---

## Task 5: Validation Schemas (Zod)

**Files:**
- Create: `src/lib/service-validation.ts`

- [ ] **Step 1: Create Zod validation schemas**

Create `src/lib/service-validation.ts`:

```typescript
/**
 * src/lib/service-validation.ts
 * Zod schemas for Leistungstausch inputs.
 */
import { z } from 'zod';

export const ServiceListingCreateSchema = z.object({
  title: z.string()
    .min(10, 'Titel muss mindestens 10 Zeichen haben.')
    .max(80, 'Titel darf maximal 80 Zeichen haben.'),
  offeredDescription: z.string()
    .min(50, 'Beschreibe deine Leistung mit mindestens 50 Zeichen.')
    .max(2000, 'Beschreibung darf maximal 2000 Zeichen haben.'),
  offeredCategoryId: z.string().min(1, 'Kategorie ist erforderlich.'),
  soughtCategoryIds: z.array(z.string().min(1))
    .min(1, 'Wähle mindestens eine gesuchte Kategorie.')
    .max(3, 'Maximal 3 gesuchte Kategorien.'),
  soughtDescription: z.string()
    .min(30, 'Beschreibe deine Gegenleistung mit mindestens 30 Zeichen.')
    .max(1000, 'Beschreibung darf maximal 1000 Zeichen haben.'),
  effort: z.enum([
    'UNTER_1_STUNDE',
    'EIN_BIS_DREI_STUNDEN',
    'DREI_BIS_ACHT_STUNDEN',
    'MEHRERE_TAGE',
    'FORTLAUFEND',
  ], { message: 'Ungültiger Aufwand.' }),
  locationType: z.enum(['VOR_ORT', 'REMOTE', 'BEIDES'], { message: 'Ungültiger Durchführungsort.' }),
  city: z.string().max(100).optional(),
  postalCode: z.string().regex(/^\d{5}$/, 'PLZ muss 5 Ziffern haben.').optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  availability: z.array(z.enum(['WERKTAGS', 'ABENDS', 'WOCHENENDE', 'FLEXIBEL'])).optional(),
  experienceLevel: z.enum(['ANFAENGER', 'FORTGESCHRITTEN', 'PROFI']).optional(),
  requirements: z.string().max(500, 'Voraussetzungen dürfen maximal 500 Zeichen haben.').optional(),
}).refine(data => {
  if (data.locationType !== 'REMOTE') {
    return !!data.city && !!data.postalCode;
  }
  return true;
}, { message: 'Stadt und PLZ sind bei Vor-Ort-Leistungen erforderlich.', path: ['city'] });

export const ServiceListingUpdateSchema = ServiceListingCreateSchema.partial();

export const ServiceListingQuerySchema = z.object({
  query: z.string().optional(),
  offeredCategory: z.string().optional(),
  soughtCategory: z.string().optional(),
  city: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(1).max(500).optional(),
  locationType: z.enum(['VOR_ORT', 'REMOTE', 'BEIDES']).optional(),
  effort: z.string().optional(), // comma-separated
  availability: z.string().optional(), // comma-separated
  experienceLevel: z.string().optional(), // comma-separated
  verifiedOnly: z.coerce.boolean().optional(),
  sortBy: z.enum(['newest', 'relevance', 'rating', 'distance']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const ServiceReportSchema = z.object({
  serviceListingId: z.string().min(1),
  reason: z.enum([
    'NICHT_DIENSTLEISTUNG',
    'DISKRIMINIERUNG',
    'SPAM',
    'BETRUG',
    'UNANGEMESSEN',
    'DUPLIKAT',
    'SONSTIGES',
  ], { message: 'Ungültiger Meldegrund.' }),
  description: z.string().max(1000).optional(),
});
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/service-validation.ts
git commit -m "feat(leistungstausch): add Zod validation schemas"
```

---

## Task 6: API — Categories Endpoint

**Files:**
- Create: `src/pages/api/leistungstausch/categories.ts`

- [ ] **Step 1: Create the categories API route**

Create `src/pages/api/leistungstausch/categories.ts`:

```typescript
import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/auth';

export const GET: APIRoute = async () => {
  try {
    const categories = await prisma.serviceCategory.findMany({
      orderBy: { position: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        description: true,
        listingCount: true,
      },
    });

    return new Response(JSON.stringify({ categories }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[API] GET /api/leistungstausch/categories error:', err);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/api/leistungstausch/categories.ts
git commit -m "feat(leistungstausch): add categories API endpoint"
```

---

## Task 7: API — Listings (GET Search + POST Create)

**Files:**
- Create: `src/pages/api/leistungstausch/listings/index.ts`

- [ ] **Step 1: Create the listings API route**

Create `src/pages/api/leistungstausch/listings/index.ts`:

```typescript
import type { APIRoute } from 'astro';
import { prisma } from '../../../../lib/auth';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { ServiceListingQuerySchema, ServiceListingCreateSchema } from '../../../../lib/service-validation';
import { filterServiceListing } from '../../../../lib/service-content-filter';

/** Haversine bounding box for fast geo pre-filter */
function geoBoundingBox(lat: number, lng: number, radiusKm: number) {
  const R = 6371;
  const dLat = radiusKm / R * (180 / Math.PI);
  const dLng = radiusKm / (R * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng };
}

/** Haversine distance in km */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

// ── GET /api/leistungstausch/listings ────────────────────────────────────────

export const GET: APIRoute = async ({ url }) => {
  const params = Object.fromEntries(url.searchParams);
  const parsed = ServiceListingQuerySchema.safeParse(params);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Parameter' }, 400);
  }

  const {
    query, offeredCategory, soughtCategory, city, lat, lng, radius,
    locationType, effort, availability, experienceLevel, verifiedOnly,
    sortBy, page, pageSize,
  } = parsed.data;

  const skip = (page - 1) * pageSize;
  const useGeo = lat !== undefined && lng !== undefined && radius !== undefined;

  // Build where clause
  const where: any = { status: 'ACTIVE', expiresAt: { gte: new Date() } };

  if (query) {
    where.OR = [
      { title: { contains: query } },
      { offeredDescription: { contains: query } },
      { soughtDescription: { contains: query } },
    ];
  }

  if (offeredCategory) {
    const cat = await prisma.serviceCategory.findUnique({ where: { slug: offeredCategory } });
    if (cat) where.offeredCategoryId = cat.id;
  }

  if (soughtCategory) {
    const cat = await prisma.serviceCategory.findUnique({ where: { slug: soughtCategory } });
    if (cat) {
      where.soughtCategories = { some: { categoryId: cat.id } };
    }
  }

  if (city) {
    where.city = { contains: city };
  }

  if (locationType) {
    where.locationType = locationType;
  }

  if (effort) {
    const efforts = effort.split(',').filter(Boolean);
    if (efforts.length > 0) where.effort = { in: efforts };
  }

  if (experienceLevel) {
    const levels = experienceLevel.split(',').filter(Boolean);
    if (levels.length > 0) where.experienceLevel = { in: levels };
  }

  if (verifiedOnly) {
    where.user = { emailVerified: true, phoneVerified: true };
  }

  if (useGeo) {
    const box = geoBoundingBox(lat, lng, radius);
    where.latitude = { gte: box.minLat, lte: box.maxLat };
    where.longitude = { gte: box.minLng, lte: box.maxLng };
  }

  // Sorting
  let orderBy: any = { createdAt: 'desc' };
  if (sortBy === 'relevance' && query) {
    orderBy = { createdAt: 'desc' }; // TODO Phase 5: Algolia relevance
  }

  try {
    const [listings, total] = await Promise.all([
      prisma.serviceListing.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, emailVerified: true, phoneVerified: true, idVerified: true, city: true } },
          offeredCategory: { select: { id: true, name: true, slug: true, icon: true } },
          soughtCategories: { include: { category: { select: { id: true, name: true, slug: true } } } },
          images: { orderBy: { position: 'asc' }, take: 1 },
        },
      }),
      prisma.serviceListing.count({ where }),
    ]);

    // Post-filter for exact geo distance
    let filteredListings = listings;
    if (useGeo) {
      filteredListings = listings.filter(l =>
        l.latitude && l.longitude && haversineKm(lat, lng, l.latitude, l.longitude) <= radius
      );
    }

    return json({
      listings: filteredListings,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    console.error('[API] GET /api/leistungstausch/listings error:', err);
    return json({ error: 'Interner Serverfehler' }, 500);
  }
};

// ── POST /api/leistungstausch/listings ───────────────────────────────────────

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await requireAuth(request, cookies);
  if (!isAuthContext(auth)) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Ungültiger Request-Body' }, 400);
  }

  const parsed = ServiceListingCreateSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? 'Validierungsfehler', issues: parsed.error.issues }, 400);
  }

  const data = parsed.data;

  // Rate limit: max 5 active listings per user
  const activeCount = await prisma.serviceListing.count({
    where: { userId: auth.userId, status: 'ACTIVE' },
  });
  if (activeCount >= 5) {
    return json({ error: 'Du kannst maximal 5 aktive Leistungstausch-Angebote haben.' }, 429);
  }

  // Content filter
  const filterResult = filterServiceListing({
    title: data.title,
    offeredDescription: data.offeredDescription,
    soughtDescription: data.soughtDescription,
    requirements: data.requirements,
  });

  if (!filterResult.passed) {
    return json({
      error: filterResult.message,
      rule: filterResult.rule,
      level: filterResult.level,
    }, 422);
  }

  // Verify categories exist
  const offeredCat = await prisma.serviceCategory.findUnique({ where: { id: data.offeredCategoryId } });
  if (!offeredCat) {
    return json({ error: 'Ungültige Kategorie.' }, 400);
  }

  const soughtCats = await prisma.serviceCategory.findMany({
    where: { id: { in: data.soughtCategoryIds } },
  });
  if (soughtCats.length !== data.soughtCategoryIds.length) {
    return json({ error: 'Eine oder mehrere gesuchte Kategorien sind ungültig.' }, 400);
  }

  try {
    const listing = await prisma.serviceListing.create({
      data: {
        title: data.title,
        offeredDescription: data.offeredDescription,
        soughtDescription: data.soughtDescription,
        effort: data.effort as any,
        locationType: data.locationType as any,
        city: data.city,
        postalCode: data.postalCode,
        latitude: data.latitude,
        longitude: data.longitude,
        availability: data.availability ? JSON.stringify(data.availability) : null,
        experienceLevel: data.experienceLevel as any ?? null,
        requirements: data.requirements,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        userId: auth.userId,
        offeredCategoryId: data.offeredCategoryId,
        soughtCategories: {
          create: data.soughtCategoryIds.map(catId => ({ categoryId: catId })),
        },
      },
      include: {
        offeredCategory: true,
        soughtCategories: { include: { category: true } },
      },
    });

    // Update category listing count
    await prisma.serviceCategory.update({
      where: { id: data.offeredCategoryId },
      data: { listingCount: { increment: 1 } },
    });

    return json({ listing }, 201);
  } catch (err) {
    console.error('[API] POST /api/leistungstausch/listings error:', err);
    return json({ error: 'Interner Serverfehler' }, 500);
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/api/leistungstausch/listings/index.ts
git commit -m "feat(leistungstausch): add listings API (GET search + POST create)"
```

---

## Task 8: API — Listing Detail, Update, Delete

**Files:**
- Create: `src/pages/api/leistungstausch/listings/[id].ts`

- [ ] **Step 1: Create the listing detail API route**

Create `src/pages/api/leistungstausch/listings/[id].ts`:

```typescript
import type { APIRoute } from 'astro';
import { prisma } from '../../../../lib/auth';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { ServiceListingUpdateSchema } from '../../../../lib/service-validation';
import { filterServiceListing } from '../../../../lib/service-content-filter';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

// ── GET /api/leistungstausch/listings/[id] ──────────────────────────────────

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) return json({ error: 'ID fehlt' }, 400);

  try {
    const listing = await prisma.serviceListing.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true, avatarUrl: true,
            city: true, emailVerified: true, phoneVerified: true, idVerified: true,
            createdAt: true, trustScore: true,
          },
        },
        offeredCategory: { select: { id: true, name: true, slug: true, icon: true } },
        soughtCategories: { include: { category: { select: { id: true, name: true, slug: true, icon: true } } } },
        images: { orderBy: { position: 'asc' } },
      },
    });

    if (!listing || listing.status === 'REMOVED') {
      return json({ error: 'Angebot nicht gefunden' }, 404);
    }

    // Increment view count (fire and forget)
    prisma.serviceListing.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});

    return json({ listing });
  } catch (err) {
    console.error('[API] GET /api/leistungstausch/listings/[id] error:', err);
    return json({ error: 'Interner Serverfehler' }, 500);
  }
};

// ── PUT /api/leistungstausch/listings/[id] ──────────────────────────────────

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(request, cookies);
  if (!isAuthContext(auth)) return auth;

  const { id } = params;
  if (!id) return json({ error: 'ID fehlt' }, 400);

  const listing = await prisma.serviceListing.findUnique({ where: { id } });
  if (!listing) return json({ error: 'Angebot nicht gefunden' }, 404);
  if (listing.userId !== auth.userId) return json({ error: 'Keine Berechtigung' }, 403);

  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Ungültiger Body' }, 400); }

  const parsed = ServiceListingUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? 'Validierungsfehler' }, 400);
  }

  const data = parsed.data;

  // Content filter on changed text fields
  const filterInput = {
    title: data.title ?? listing.title,
    offeredDescription: data.offeredDescription ?? listing.offeredDescription,
    soughtDescription: data.soughtDescription ?? listing.soughtDescription,
    requirements: data.requirements ?? listing.requirements ?? undefined,
  };
  const filterResult = filterServiceListing(filterInput);
  if (!filterResult.passed) {
    return json({ error: filterResult.message, rule: filterResult.rule }, 422);
  }

  try {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.offeredDescription !== undefined) updateData.offeredDescription = data.offeredDescription;
    if (data.soughtDescription !== undefined) updateData.soughtDescription = data.soughtDescription;
    if (data.effort !== undefined) updateData.effort = data.effort;
    if (data.locationType !== undefined) updateData.locationType = data.locationType;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.postalCode !== undefined) updateData.postalCode = data.postalCode;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.availability !== undefined) updateData.availability = JSON.stringify(data.availability);
    if (data.experienceLevel !== undefined) updateData.experienceLevel = data.experienceLevel;
    if (data.requirements !== undefined) updateData.requirements = data.requirements;

    if (data.offeredCategoryId !== undefined) {
      const cat = await prisma.serviceCategory.findUnique({ where: { id: data.offeredCategoryId } });
      if (!cat) return json({ error: 'Ungültige Kategorie' }, 400);
      // Decrement old, increment new
      await prisma.serviceCategory.update({ where: { id: listing.offeredCategoryId }, data: { listingCount: { decrement: 1 } } });
      await prisma.serviceCategory.update({ where: { id: data.offeredCategoryId }, data: { listingCount: { increment: 1 } } });
      updateData.offeredCategoryId = data.offeredCategoryId;
    }

    if (data.soughtCategoryIds !== undefined) {
      await prisma.serviceListingSoughtCategory.deleteMany({ where: { serviceListingId: id } });
      await prisma.serviceListingSoughtCategory.createMany({
        data: data.soughtCategoryIds.map(catId => ({ serviceListingId: id, categoryId: catId })),
      });
    }

    const updated = await prisma.serviceListing.update({
      where: { id },
      data: updateData,
      include: {
        offeredCategory: true,
        soughtCategories: { include: { category: true } },
        images: { orderBy: { position: 'asc' } },
      },
    });

    return json({ listing: updated });
  } catch (err) {
    console.error('[API] PUT /api/leistungstausch/listings/[id] error:', err);
    return json({ error: 'Interner Serverfehler' }, 500);
  }
};

// ── DELETE /api/leistungstausch/listings/[id] ────────────────────────────────

export const DELETE: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(request, cookies);
  if (!isAuthContext(auth)) return auth;

  const { id } = params;
  if (!id) return json({ error: 'ID fehlt' }, 400);

  const listing = await prisma.serviceListing.findUnique({ where: { id } });
  if (!listing) return json({ error: 'Angebot nicht gefunden' }, 404);

  // Only owner or admin can delete
  if (listing.userId !== auth.userId && auth.user.role !== 'ADMIN') {
    return json({ error: 'Keine Berechtigung' }, 403);
  }

  try {
    await prisma.serviceListing.update({
      where: { id },
      data: { status: 'REMOVED' },
    });

    // Decrement category count
    await prisma.serviceCategory.update({
      where: { id: listing.offeredCategoryId },
      data: { listingCount: { decrement: 1 } },
    });

    return json({ success: true });
  } catch (err) {
    console.error('[API] DELETE /api/leistungstausch/listings/[id] error:', err);
    return json({ error: 'Interner Serverfehler' }, 500);
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/api/leistungstausch/listings/[id].ts
git commit -m "feat(leistungstausch): add listing detail/update/delete API"
```

---

## Task 9: API — Reports Endpoint

**Files:**
- Create: `src/pages/api/leistungstausch/reports.ts`

- [ ] **Step 1: Create the reports API route**

Create `src/pages/api/leistungstausch/reports.ts`:

```typescript
import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/auth';
import { requireAuth, isAuthContext } from '../../../lib/auth-middleware';
import { ServiceReportSchema } from '../../../lib/service-validation';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await requireAuth(request, cookies);
  if (!isAuthContext(auth)) return auth;

  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Ungültiger Body' }, 400); }

  const parsed = ServiceReportSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? 'Validierungsfehler' }, 400);
  }

  const { serviceListingId, reason, description } = parsed.data;

  // Check listing exists
  const listing = await prisma.serviceListing.findUnique({ where: { id: serviceListingId } });
  if (!listing) return json({ error: 'Angebot nicht gefunden' }, 404);

  // Can't report own listing
  if (listing.userId === auth.userId) {
    return json({ error: 'Du kannst dein eigenes Angebot nicht melden.' }, 400);
  }

  // Check for duplicate report
  const existing = await prisma.serviceListingReport.findUnique({
    where: { serviceListingId_reporterId: { serviceListingId, reporterId: auth.userId } },
  });
  if (existing) {
    return json({ error: 'Du hast dieses Angebot bereits gemeldet.' }, 409);
  }

  try {
    const report = await prisma.serviceListingReport.create({
      data: {
        serviceListingId,
        reporterId: auth.userId,
        reason: reason as any,
        description,
      },
    });

    // Auto-pause listing if 3+ reports
    const reportCount = await prisma.serviceListingReport.count({ where: { serviceListingId } });
    if (reportCount >= 3 && listing.status === 'ACTIVE') {
      await prisma.serviceListing.update({
        where: { id: serviceListingId },
        data: { status: 'PAUSED' },
      });
    }

    return json({ report }, 201);
  } catch (err) {
    console.error('[API] POST /api/leistungstausch/reports error:', err);
    return json({ error: 'Interner Serverfehler' }, 500);
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/api/leistungstausch/reports.ts
git commit -m "feat(leistungstausch): add reports API with auto-pause on 3+ reports"
```

---

## Task 10: Tailwind — Add Teal Color Palette

**Files:**
- Modify: `tailwind.config.mjs`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Add teal colors to tailwind.config.mjs**

In `tailwind.config.mjs`, inside the `colors` object in `theme.extend` (after the `secondary` entry around line 52), add:

```javascript
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
```

- [ ] **Step 2: Add leistungstausch CSS variables and component classes to global.css**

In `src/styles/global.css`, add at the end of the `@layer base` block (before the closing `}`), add:

```css
  /* Leistungstausch theme variables */
  .leistungstausch {
    --primary: #0D9488;
    --primary-light: #CCFBF1;
    --primary-dark: #0F766E;
  }
```

Then add after the `.scrollbar-hide` block, at the end of the file:

```css
/* ── Leistungstausch Components ─────────────────────────────────────────────── */

.lt-badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800;
}

.lt-badge-sm {
  @apply inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-teal-50 text-teal-700;
}

.btn-teal {
  @apply inline-flex items-center justify-center px-5 py-3 rounded-DEFAULT text-sm font-semibold
    bg-teal-600 text-white shadow-sm
    hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2
    transition-all duration-200;
}

.btn-teal-outline {
  @apply inline-flex items-center justify-center px-5 py-3 rounded-DEFAULT text-sm font-semibold
    border-2 border-teal-600 text-teal-700 bg-transparent
    hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2
    transition-all duration-200;
}

.btn-teal-ghost {
  @apply inline-flex items-center justify-center px-4 py-2 rounded-DEFAULT text-sm font-medium
    text-teal-700 bg-transparent
    hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500
    transition-all duration-200;
}

.lt-card {
  @apply bg-surface border border-border rounded-DEFAULT shadow-sm
    hover:shadow-md hover:border-teal-200
    transition-all duration-200 overflow-hidden;
}

.lt-info-banner {
  @apply bg-teal-50 border border-teal-200 rounded-DEFAULT px-4 py-3 text-sm text-teal-800;
}
```

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.mjs src/styles/global.css
git commit -m "feat(leistungstausch): add teal color palette and component CSS classes"
```

---

## Task 11: Header — Add Leistungstausch Navigation Link

**Files:**
- Modify: `src/components/Header.astro`

- [ ] **Step 1: Add Leistungstausch to the navLinks array**

In `src/components/Header.astro` line 4, change the `navLinks` array from:

```javascript
const navLinks = [
    { href: "/", label: "Startseite" },
    { href: "/kategorien", label: "Kategorien" },
    { href: "/sicherheit", label: "Sicherheit" },
];
```

to:

```javascript
const navLinks = [
    { href: "/", label: "Startseite" },
    { href: "/kategorien", label: "Kategorien" },
    { href: "/leistungstausch", label: "Leistungstausch", teal: true },
    { href: "/sicherheit", label: "Sicherheit" },
];
```

- [ ] **Step 2: Update the nav link rendering to support teal styling**

In the desktop nav `{navLinks.map(...)}` block (around line 38-47), change the class logic to highlight the Leistungstausch link in teal:

```jsx
{navLinks.map((link) => (
    <a
        href={link.href}
        class={`text-sm font-medium transition-colors duration-200 ${
            currentPath.startsWith(link.href) && link.href !== '/'
            ? (link.teal ? "text-teal-600" : "text-primary")
            : currentPath === link.href
            ? (link.teal ? "text-teal-600" : "text-primary")
            : link.teal
            ? "text-teal-600 hover:text-teal-700"
            : "text-text-secondary hover:text-text"
        }`}
    >
        {link.label}
    </a>
))}
```

- [ ] **Step 3: Also update the mobile menu nav links to include Leistungstausch**

Find the mobile navigation section (it will reuse `navLinks` or have a separate mobile nav block). Ensure the same `navLinks` array is used for mobile rendering so Leistungstausch appears in the mobile menu too.

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.astro
git commit -m "feat(leistungstausch): add navigation link in header with teal styling"
```

---

## Task 12: Astro Components — ServiceHero, ServiceCategoryBar, ServiceCard

**Files:**
- Create: `src/components/leistungstausch/ServiceHero.astro`
- Create: `src/components/leistungstausch/ServiceCategoryBar.astro`
- Create: `src/components/leistungstausch/ServiceCard.astro`

- [ ] **Step 1: Create ServiceHero.astro**

Create `src/components/leistungstausch/ServiceHero.astro`:

```astro
---
interface Props {
  currentQuery?: string;
}
const { currentQuery = '' } = Astro.props;
---

<section class="bg-gradient-to-br from-teal-800 via-teal-700 to-teal-600 text-white py-16 sm:py-24 relative overflow-hidden">
  <!-- Subtle pattern overlay -->
  <div class="absolute inset-0 opacity-10" style="background-image: url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; viewBox=&quot;0 0 60 60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cg fill=&quot;none&quot; fill-rule=&quot;evenodd&quot;%3E%3Cg fill=&quot;%23ffffff&quot; fill-opacity=&quot;0.4&quot;%3E%3Cpath d=&quot;M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z&quot;/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');"></div>

  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
    <div class="max-w-2xl">
      <div class="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>
        Dienstleistung gegen Dienstleistung
      </div>
      <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-[1.1] mb-4 tracking-tight">
        Leistung gegen Leistung
      </h1>
      <p class="text-lg sm:text-xl text-white/80 mb-8 max-w-lg leading-relaxed">
        Biete was du kannst. Bekomme was du brauchst.<br class="hidden sm:block" />
        Ohne Geld. Ohne Waren.
      </p>

      <form id="ltSearchForm" method="GET" action="/leistungstausch" class="flex flex-col sm:flex-row gap-2 max-w-xl mb-6">
        <label class="sr-only" for="ltSearchQuery">Was suchst du?</label>
        <input
          id="ltSearchQuery"
          name="query"
          value={currentQuery}
          placeholder="Was suchst du? z.B. Umzugshilfe, Webdesign..."
          class="flex-grow px-4 py-3.5 rounded-DEFAULT bg-white text-text placeholder-text-muted text-base focus:outline-none focus:ring-2 focus:ring-teal-400/60"
        />
        <button type="submit" class="btn-teal px-8 whitespace-nowrap">
          Suchen
        </button>
      </form>

      <a href="/leistungstausch/erstellen" class="inline-flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M12 4v16m8-8H4"/></svg>
        Eigenes Angebot erstellen
      </a>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Create ServiceCategoryBar.astro**

Create `src/components/leistungstausch/ServiceCategoryBar.astro`:

```astro
---
import { serviceCategories } from '../../data/service-categories';

interface Props {
  activeSlug?: string;
}
const { activeSlug } = Astro.props;
---

<div class="bg-surface border-b border-border">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
      <a
        href="/leistungstausch"
        class={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
          !activeSlug
            ? 'bg-teal-600 text-white'
            : 'bg-background text-text-secondary hover:bg-teal-50 hover:text-teal-700'
        }`}
      >
        Alle
      </a>
      {serviceCategories.map((cat) => (
        <a
          href={`/leistungstausch?offeredCategory=${cat.slug}`}
          class={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
            activeSlug === cat.slug
              ? 'bg-teal-600 text-white'
              : 'bg-background text-text-secondary hover:bg-teal-50 hover:text-teal-700'
          }`}
        >
          {cat.name}
        </a>
      ))}
    </div>
  </div>
</div>
```

- [ ] **Step 3: Create ServiceCard.astro**

Create `src/components/leistungstausch/ServiceCard.astro`:

```astro
---
import { effortLabels, locationTypeLabels } from '../../data/service-categories';

interface Props {
  listing: {
    id: string;
    title: string;
    offeredDescription: string;
    effort: string;
    locationType: string;
    city?: string | null;
    viewCount: number;
    createdAt: string;
    offeredCategory: { name: string; slug: string; icon?: string | null };
    soughtCategories: Array<{ category: { name: string; slug: string } }>;
    user: {
      firstName?: string | null;
      lastName?: string | null;
      emailVerified: boolean;
      phoneVerified: boolean;
      idVerified: boolean;
    };
    images: Array<{ url: string }>;
  };
}

const { listing } = Astro.props;
const isVerified = listing.user.emailVerified && listing.user.phoneVerified;
const displayName = listing.user.firstName ?? 'Nutzer';
const firstImage = listing.images[0]?.url;
const effortLabel = effortLabels[listing.effort] ?? listing.effort;
const locationLabel = locationTypeLabels[listing.locationType] ?? listing.locationType;
---

<a href={`/leistungstausch/angebot/${listing.id}`} class="lt-card group block">
  <!-- Image or Category Placeholder -->
  <div class="aspect-[16/10] bg-teal-50 flex items-center justify-center overflow-hidden">
    {firstImage ? (
      <img src={firstImage} alt={listing.title} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
    ) : (
      <div class="flex flex-col items-center gap-2 text-teal-400">
        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
        </svg>
        <span class="text-xs font-medium">{listing.offeredCategory.name}</span>
      </div>
    )}
  </div>

  <div class="p-4">
    <!-- Category Badge -->
    <div class="flex items-center gap-2 mb-2">
      <span class="lt-badge">{listing.offeredCategory.name}</span>
      {isVerified && (
        <span class="inline-flex items-center gap-1 text-xs text-teal-700">
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>
          Verifiziert
        </span>
      )}
    </div>

    <!-- Title -->
    <h3 class="text-base font-semibold text-text mb-2 line-clamp-2 group-hover:text-teal-700 transition-colors">
      {listing.title}
    </h3>

    <!-- Sought Categories -->
    <div class="flex flex-wrap gap-1 mb-3">
      {listing.soughtCategories.slice(0, 3).map((sc) => (
        <span class="lt-badge-sm">{sc.category.name}</span>
      ))}
    </div>

    <!-- Meta -->
    <div class="flex items-center gap-3 text-xs text-text-secondary">
      <span class="flex items-center gap-1">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        {effortLabel}
      </span>
      <span class="flex items-center gap-1">
        {listing.locationType === 'REMOTE' ? (
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>
        ) : (
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>
        )}
        {listing.locationType === 'REMOTE' ? 'Remote' : listing.city ?? locationLabel}
      </span>
    </div>
  </div>
</a>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/leistungstausch/ServiceHero.astro src/components/leistungstausch/ServiceCategoryBar.astro src/components/leistungstausch/ServiceCard.astro
git commit -m "feat(leistungstausch): add ServiceHero, ServiceCategoryBar, ServiceCard components"
```

---

## Task 13: Astro Components — ServiceFilters, ServiceDetail, ServiceProviderCard

**Files:**
- Create: `src/components/leistungstausch/ServiceFilters.astro`
- Create: `src/components/leistungstausch/ServiceDetail.astro`
- Create: `src/components/leistungstausch/ServiceProviderCard.astro`

- [ ] **Step 1: Create ServiceFilters.astro**

Create `src/components/leistungstausch/ServiceFilters.astro`:

```astro
---
import { serviceCategories, effortLabels } from '../../data/service-categories';

interface Props {
  currentParams: Record<string, string>;
}
const { currentParams } = Astro.props;
---

<div class="bg-surface border-b border-border">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
    <form method="GET" action="/leistungstausch" class="flex flex-wrap items-end gap-3">
      <!-- Offered Category -->
      <div class="flex flex-col gap-1">
        <label for="filter-offered" class="text-label text-text-secondary uppercase">Bietet an</label>
        <select id="filter-offered" name="offeredCategory" class="select-field text-sm py-2 min-w-[160px]">
          <option value="">Alle Kategorien</option>
          {serviceCategories.map(c => (
            <option value={c.slug} selected={currentParams.offeredCategory === c.slug}>{c.name}</option>
          ))}
        </select>
      </div>

      <!-- Sought Category -->
      <div class="flex flex-col gap-1">
        <label for="filter-sought" class="text-label text-text-secondary uppercase">Sucht</label>
        <select id="filter-sought" name="soughtCategory" class="select-field text-sm py-2 min-w-[160px]">
          <option value="">Alle Kategorien</option>
          {serviceCategories.map(c => (
            <option value={c.slug} selected={currentParams.soughtCategory === c.slug}>{c.name}</option>
          ))}
        </select>
      </div>

      <!-- City -->
      <div class="flex flex-col gap-1">
        <label for="filter-city" class="text-label text-text-secondary uppercase">Ort</label>
        <input id="filter-city" name="city" value={currentParams.city ?? ''} placeholder="Stadt oder PLZ" class="input-field text-sm py-2 w-36" />
      </div>

      <!-- Location Type -->
      <div class="flex flex-col gap-1">
        <label for="filter-location" class="text-label text-text-secondary uppercase">Durchführung</label>
        <select id="filter-location" name="locationType" class="select-field text-sm py-2">
          <option value="">Egal</option>
          <option value="VOR_ORT" selected={currentParams.locationType === 'VOR_ORT'}>Vor Ort</option>
          <option value="REMOTE" selected={currentParams.locationType === 'REMOTE'}>Remote</option>
          <option value="BEIDES" selected={currentParams.locationType === 'BEIDES'}>Beides</option>
        </select>
      </div>

      <!-- Effort -->
      <div class="flex flex-col gap-1">
        <label for="filter-effort" class="text-label text-text-secondary uppercase">Aufwand</label>
        <select id="filter-effort" name="effort" class="select-field text-sm py-2">
          <option value="">Egal</option>
          {Object.entries(effortLabels).map(([key, label]) => (
            <option value={key} selected={currentParams.effort === key}>{label}</option>
          ))}
        </select>
      </div>

      <!-- Submit -->
      <button type="submit" class="btn-teal py-2 px-6 text-sm">Filtern</button>

      {Object.values(currentParams).some(v => v) && (
        <a href="/leistungstausch" class="btn-teal-ghost py-2 px-3 text-sm">Zurücksetzen</a>
      )}

      <!-- Keep query param -->
      {currentParams.query && <input type="hidden" name="query" value={currentParams.query} />}
    </form>
  </div>
</div>
```

- [ ] **Step 2: Create ServiceDetail.astro**

Create `src/components/leistungstausch/ServiceDetail.astro`:

```astro
---
import { effortLabels, experienceLevelLabels, availabilityLabels, locationTypeLabels } from '../../data/service-categories';

interface Props {
  listing: any; // Full listing object from API
}
const { listing } = Astro.props;
const availability = listing.availability ? JSON.parse(listing.availability) : [];
---

<div>
  <!-- Category Badge -->
  <div class="mb-4">
    <span class="lt-badge text-sm">{listing.offeredCategory.name}</span>
  </div>

  <!-- Title -->
  <h1 class="text-2xl sm:text-3xl font-bold text-text mb-6 tracking-tight">{listing.title}</h1>

  <!-- What I offer -->
  <section class="mb-8">
    <h2 class="text-lg font-semibold text-text mb-3 flex items-center gap-2">
      <span class="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold">→</span>
      Was ich anbiete
    </h2>
    <div class="pl-10">
      <p class="text-text-secondary leading-relaxed whitespace-pre-line">{listing.offeredDescription}</p>
      <div class="flex flex-wrap gap-4 mt-4 text-sm text-text-secondary">
        <span class="flex items-center gap-1.5">
          <svg class="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          {effortLabels[listing.effort] ?? listing.effort}
        </span>
        {listing.experienceLevel && (
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
            {experienceLevelLabels[listing.experienceLevel]}
          </span>
        )}
      </div>
    </div>
  </section>

  <!-- What I'm looking for -->
  <section class="mb-8">
    <h2 class="text-lg font-semibold text-text mb-3 flex items-center gap-2">
      <span class="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold">←</span>
      Was ich suche
    </h2>
    <div class="pl-10">
      <div class="flex flex-wrap gap-2 mb-3">
        {listing.soughtCategories.map((sc: any) => (
          <span class="lt-badge">{sc.category.name}</span>
        ))}
      </div>
      <p class="text-text-secondary leading-relaxed whitespace-pre-line">{listing.soughtDescription}</p>
    </div>
  </section>

  <!-- Requirements -->
  {listing.requirements && (
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-text mb-3 flex items-center gap-2">
        <span class="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold">!</span>
        Voraussetzungen
      </h2>
      <div class="pl-10">
        <p class="text-text-secondary leading-relaxed">{listing.requirements}</p>
      </div>
    </section>
  )}

  <!-- Images -->
  {listing.images.length > 0 && (
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-text mb-3">Bilder & Referenzen</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {listing.images.map((img: any) => (
          <img src={img.url} alt="Referenzbild" class="rounded-DEFAULT object-cover aspect-square w-full" loading="lazy" />
        ))}
      </div>
    </section>
  )}
</div>
```

- [ ] **Step 3: Create ServiceProviderCard.astro**

Create `src/components/leistungstausch/ServiceProviderCard.astro`:

```astro
---
import { locationTypeLabels, effortLabels, availabilityLabels } from '../../data/service-categories';

interface Props {
  listing: any;
  isOwner: boolean;
}
const { listing, isOwner } = Astro.props;
const user = listing.user;
const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Nutzer';
const initial = (user.firstName?.[0] || 'N').toUpperCase();
const memberSince = new Date(user.createdAt).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
const availability = listing.availability ? JSON.parse(listing.availability) : [];
const expiresDate = new Date(listing.expiresAt).toLocaleDateString('de-DE');
---

<div class="space-y-4">
  <!-- Provider Card -->
  <div class="bg-surface border border-border rounded-DEFAULT p-5">
    <div class="flex items-center gap-3 mb-4">
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt={displayName} class="w-12 h-12 rounded-full object-cover" />
      ) : (
        <div class="w-12 h-12 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-lg font-bold">
          {initial}
        </div>
      )}
      <div>
        <a href={`/profil/${user.id}`} class="font-semibold text-text hover:text-teal-700 transition-colors">{displayName}</a>
        <p class="text-xs text-text-secondary">Mitglied seit {memberSince}</p>
      </div>
    </div>

    <!-- Verification Badges -->
    <div class="flex flex-wrap gap-2 mb-4">
      {user.emailVerified && (
        <span class="inline-flex items-center gap-1 text-xs text-teal-700 bg-teal-50 rounded-full px-2.5 py-1">
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>
          E-Mail
        </span>
      )}
      {user.phoneVerified && (
        <span class="inline-flex items-center gap-1 text-xs text-teal-700 bg-teal-50 rounded-full px-2.5 py-1">
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>
          Telefon
        </span>
      )}
      {user.idVerified && (
        <span class="inline-flex items-center gap-1 text-xs text-teal-700 bg-teal-50 rounded-full px-2.5 py-1">
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>
          ID verifiziert
        </span>
      )}
    </div>

    <!-- Action Buttons -->
    {!isOwner && (
      <div class="space-y-2">
        <a href={`/nachrichten?to=${user.id}&context=service:${listing.id}`} class="btn-teal w-full text-center">
          Nachricht senden
        </a>
      </div>
    )}
  </div>

  <!-- Details Card -->
  <div class="bg-surface border border-border rounded-DEFAULT p-5">
    <h3 class="text-sm font-semibold text-text mb-3">Details</h3>
    <dl class="space-y-2.5 text-sm">
      {listing.city && (
        <div class="flex items-center gap-2">
          <dt class="text-text-secondary flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>
          </dt>
          <dd class="text-text">{listing.city}{listing.postalCode ? ` (${listing.postalCode})` : ''}</dd>
        </div>
      )}
      <div class="flex items-center gap-2">
        <dt class="text-text-secondary flex items-center gap-1.5">
          {listing.locationType === 'REMOTE' ? (
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>
          ) : (
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>
          )}
        </dt>
        <dd class="text-text">{locationTypeLabels[listing.locationType]}</dd>
      </div>
      <div class="flex items-center gap-2">
        <dt class="text-text-secondary flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        </dt>
        <dd class="text-text">{effortLabels[listing.effort]}</dd>
      </div>
      {availability.length > 0 && (
        <div class="flex items-center gap-2">
          <dt class="text-text-secondary flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          </dt>
          <dd class="text-text">{availability.map((a: string) => availabilityLabels[a] ?? a).join(', ')}</dd>
        </div>
      )}
      <div class="flex items-center gap-2">
        <dt class="text-text-secondary flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </dt>
        <dd class="text-text">Gültig bis {expiresDate}</dd>
      </div>
    </dl>
  </div>

  <!-- Report Link -->
  {!isOwner && (
    <button
      class="text-xs text-text-muted hover:text-danger transition-colors flex items-center gap-1"
      data-report-listing={listing.id}
    >
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z"/></svg>
      Angebot melden
    </button>
  )}
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/leistungstausch/ServiceFilters.astro src/components/leistungstausch/ServiceDetail.astro src/components/leistungstausch/ServiceProviderCard.astro
git commit -m "feat(leistungstausch): add ServiceFilters, ServiceDetail, ServiceProviderCard components"
```

---

## Task 14: Overview Page — `/leistungstausch`

**Files:**
- Create: `src/pages/leistungstausch/index.astro`

- [ ] **Step 1: Create the overview page**

Create `src/pages/leistungstausch/index.astro`:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Header from '../../components/Header.astro';
import Footer from '../../components/Footer.astro';
import ServiceHero from '../../components/leistungstausch/ServiceHero.astro';
import ServiceCategoryBar from '../../components/leistungstausch/ServiceCategoryBar.astro';
import ServiceFilters from '../../components/leistungstausch/ServiceFilters.astro';
import ServiceCard from '../../components/leistungstausch/ServiceCard.astro';

const currentParams: Record<string, string> = {};
for (const [k, v] of Astro.url.searchParams) {
  if (['query', 'offeredCategory', 'soughtCategory', 'city', 'locationType', 'effort', 'sortBy', 'page'].includes(k)) {
    currentParams[k] = v;
  }
}

const internalOrigin = import.meta.env.PROD ? `http://localhost:${import.meta.env.PORT || 3000}` : Astro.url.origin;
const url = new URL('/api/leistungstausch/listings', internalOrigin);
url.searchParams.set('pageSize', '21');
for (const [k, v] of Object.entries(currentParams)) {
  if (v) url.searchParams.set(k, v);
}

const res = await fetch(url.toString());
const data = res.ok
  ? await res.json()
  : { listings: [], pagination: { total: 0, totalPages: 1, page: 1 } };
const { listings, pagination } = data;
const currentPage = pagination?.page ?? 1;
const totalPages = pagination?.totalPages ?? 1;
---

<BaseLayout
  title="Leistungstausch — Dienstleistung gegen Dienstleistung | Ehren-Deal"
  description="Tausche deine Fähigkeiten: Biete eine Dienstleistung an und erhalte eine zurück. Ohne Geld, ohne Waren. Nur auf Ehren-Deal."
>
  <Header />
  <main id="main-content" class="min-h-screen">

    <ServiceHero currentQuery={currentParams.query} />
    <ServiceCategoryBar activeSlug={currentParams.offeredCategory} />
    <ServiceFilters currentParams={currentParams} />

    <!-- Info Banner -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
      <div class="lt-info-banner flex items-center gap-2">
        <svg class="w-4 h-4 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>
        <span>Leistungstausch — Dienstleistung gegen Dienstleistung. Ohne Geld, ohne Waren.</span>
      </div>
    </div>

    <!-- Results -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {listings.length > 0 ? (
        <>
          <p class="text-sm text-text-secondary mb-6">
            {pagination.total} {pagination.total === 1 ? 'Angebot' : 'Angebote'} gefunden
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing: any) => (
              <ServiceCard listing={listing} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav class="flex justify-center gap-2 mt-10" aria-label="Seitennavigation">
              {currentPage > 1 && (
                <a href={`/leistungstausch?${new URLSearchParams({ ...currentParams, page: String(currentPage - 1) })}`} class="btn-teal-outline py-2 px-4 text-sm">
                  Zurück
                </a>
              )}
              <span class="flex items-center px-4 text-sm text-text-secondary">
                Seite {currentPage} von {totalPages}
              </span>
              {currentPage < totalPages && (
                <a href={`/leistungstausch?${new URLSearchParams({ ...currentParams, page: String(currentPage + 1) })}`} class="btn-teal-outline py-2 px-4 text-sm">
                  Weiter
                </a>
              )}
            </nav>
          )}
        </>
      ) : (
        <div class="text-center py-20">
          <div class="w-16 h-16 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>
          </div>
          <h2 class="text-xl font-semibold text-text mb-2">Noch keine Angebote</h2>
          <p class="text-text-secondary mb-6">Sei der Erste und erstelle ein Leistungstausch-Angebot!</p>
          <a href="/leistungstausch/erstellen" class="btn-teal">Angebot erstellen</a>
        </div>
      )}
    </div>

  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/leistungstausch/index.astro
git commit -m "feat(leistungstausch): add overview page with search, filters, and card grid"
```

---

## Task 15: Detail Page — `/leistungstausch/angebot/[id]`

**Files:**
- Create: `src/pages/leistungstausch/angebot/[id].astro`

- [ ] **Step 1: Create the detail page**

Create `src/pages/leistungstausch/angebot/[id].astro`:

```astro
---
import BaseLayout from '../../../layouts/BaseLayout.astro';
import Header from '../../../components/Header.astro';
import Footer from '../../../components/Footer.astro';
import ServiceDetail from '../../../components/leistungstausch/ServiceDetail.astro';
import ServiceProviderCard from '../../../components/leistungstausch/ServiceProviderCard.astro';
import { lucia } from '../../../lib/auth';

const { id } = Astro.params;

// Fetch listing detail
const internalOrigin = import.meta.env.PROD ? `http://localhost:${import.meta.env.PORT || 3000}` : Astro.url.origin;
const res = await fetch(`${internalOrigin}/api/leistungstausch/listings/${id}`);

if (!res.ok) {
  return Astro.redirect('/leistungstausch');
}

const { listing } = await res.json();

// Check if current user is the owner
let isOwner = false;
const sessionId = Astro.cookies.get(lucia.sessionCookieName)?.value;
if (sessionId) {
  try {
    const { user } = await lucia.validateSession(sessionId);
    if (user && user.id === listing.userId) isOwner = true;
  } catch {}
}

const pageTitle = `${listing.title} — Leistungstausch | Ehren-Deal`;
const pageDesc = listing.offeredDescription.slice(0, 160);
---

<BaseLayout title={pageTitle} description={pageDesc}>
  <Header />
  <main id="main-content" class="min-h-screen bg-background">

    <!-- Breadcrumb -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <nav class="flex items-center gap-2 text-sm text-text-secondary">
        <a href="/leistungstausch" class="hover:text-teal-700 transition-colors">Leistungstausch</a>
        <span>/</span>
        <a href={`/leistungstausch?offeredCategory=${listing.offeredCategory.slug}`} class="hover:text-teal-700 transition-colors">{listing.offeredCategory.name}</a>
        <span>/</span>
        <span class="text-text truncate max-w-xs">{listing.title}</span>
      </nav>
    </div>

    <!-- Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      <div class="lt-info-banner mb-6 flex items-center gap-2">
        <svg class="w-4 h-4 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>
        <span>Leistungstausch — Dienstleistung gegen Dienstleistung. Ohne Geld, ohne Waren.</span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Main Content -->
        <div class="lg:col-span-2">
          <div class="bg-surface border border-border rounded-DEFAULT p-6 sm:p-8">
            <ServiceDetail listing={listing} />
          </div>
        </div>

        <!-- Sidebar -->
        <div class="lg:col-span-1">
          <div class="sticky top-20">
            <ServiceProviderCard listing={listing} isOwner={isOwner} />
          </div>
        </div>
      </div>
    </div>

  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/leistungstausch/angebot/\[id\].astro
git commit -m "feat(leistungstausch): add listing detail page"
```

---

## Task 16: Create Listing Page with React Wizard

**Files:**
- Create: `src/pages/leistungstausch/erstellen.astro`
- Create: `src/components/leistungstausch/ServiceCreateWizard.tsx`

- [ ] **Step 1: Create the host page**

Create `src/pages/leistungstausch/erstellen.astro`:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Header from '../../components/Header.astro';
import Footer from '../../components/Footer.astro';
import ServiceCreateWizard from '../../components/leistungstausch/ServiceCreateWizard';
import { lucia } from '../../lib/auth';

// Require auth
const sessionId = Astro.cookies.get(lucia.sessionCookieName)?.value;
if (!sessionId) return Astro.redirect('/anmelden?redirect=/leistungstausch/erstellen');

try {
  const { user } = await lucia.validateSession(sessionId);
  if (!user) return Astro.redirect('/anmelden?redirect=/leistungstausch/erstellen');
} catch {
  return Astro.redirect('/anmelden?redirect=/leistungstausch/erstellen');
}

// Fetch categories
const internalOrigin = import.meta.env.PROD ? `http://localhost:${import.meta.env.PORT || 3000}` : Astro.url.origin;
const catRes = await fetch(`${internalOrigin}/api/leistungstausch/categories`);
const { categories } = catRes.ok ? await catRes.json() : { categories: [] };
---

<BaseLayout title="Angebot erstellen — Leistungstausch | Ehren-Deal">
  <Header />
  <main id="main-content" class="min-h-screen bg-background">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ServiceCreateWizard client:load categories={categories} />
    </div>
  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 2: Create the React wizard component**

Create `src/components/leistungstausch/ServiceCreateWizard.tsx`:

```tsx
import { useState } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

interface Props {
  categories: Category[];
}

const EFFORT_OPTIONS = [
  { value: 'UNTER_1_STUNDE', label: 'Unter 1 Stunde' },
  { value: 'EIN_BIS_DREI_STUNDEN', label: '1–3 Stunden' },
  { value: 'DREI_BIS_ACHT_STUNDEN', label: '3–8 Stunden (Tagesaufgabe)' },
  { value: 'MEHRERE_TAGE', label: 'Mehrere Tage' },
  { value: 'FORTLAUFEND', label: 'Fortlaufend / Regelmäßig' },
];

const EXPERIENCE_OPTIONS = [
  { value: 'ANFAENGER', label: 'Anfänger' },
  { value: 'FORTGESCHRITTEN', label: 'Fortgeschritten' },
  { value: 'PROFI', label: 'Profi' },
];

const LOCATION_OPTIONS = [
  { value: 'VOR_ORT', label: 'Vor Ort' },
  { value: 'REMOTE', label: 'Remote' },
  { value: 'BEIDES', label: 'Beides möglich' },
];

const AVAILABILITY_OPTIONS = [
  { value: 'WERKTAGS', label: 'Werktags' },
  { value: 'ABENDS', label: 'Abends' },
  { value: 'WOCHENENDE', label: 'Wochenende' },
  { value: 'FLEXIBEL', label: 'Flexibel' },
];

export default function ServiceCreateWizard({ categories }: Props) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // Step 1 fields
  const [title, setTitle] = useState('');
  const [offeredCategoryId, setOfferedCategoryId] = useState('');
  const [offeredDescription, setOfferedDescription] = useState('');
  const [effort, setEffort] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');

  // Step 2 fields
  const [soughtCategoryIds, setSoughtCategoryIds] = useState<string[]>([]);
  const [soughtDescription, setSoughtDescription] = useState('');
  const [locationType, setLocationType] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [availability, setAvailability] = useState<string[]>([]);
  const [requirements, setRequirements] = useState('');

  const toggleSoughtCategory = (id: string) => {
    setSoughtCategoryIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const toggleAvailability = (val: string) => {
    setAvailability(prev =>
      prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
    );
  };

  const canProceedStep1 = title.length >= 10 && offeredCategoryId && offeredDescription.length >= 50 && effort;
  const canProceedStep2 = soughtCategoryIds.length >= 1 && soughtDescription.length >= 30 && locationType &&
    (locationType === 'REMOTE' || (city && postalCode));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setWarning(null);

    try {
      const res = await fetch('/api/leistungstausch/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          offeredCategoryId,
          offeredDescription,
          effort,
          experienceLevel: experienceLevel || undefined,
          soughtCategoryIds,
          soughtDescription,
          locationType,
          city: city || undefined,
          postalCode: postalCode || undefined,
          availability: availability.length > 0 ? availability : undefined,
          requirements: requirements || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.level === 'hard_block') {
          setError(data.error);
        } else {
          setError(data.error || 'Ein Fehler ist aufgetreten.');
        }
        setSubmitting(false);
        return;
      }

      // Success — redirect to the new listing
      window.location.href = `/leistungstausch/angebot/${data.listing.id}`;
    } catch {
      setError('Netzwerkfehler. Bitte versuche es erneut.');
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1A2332] mb-2">Leistungstausch-Angebot erstellen</h1>
        <div className="bg-[#F0FDFA] border border-[#99F6E4] rounded-[10px] px-4 py-3 text-sm text-[#115E59]">
          Du bietest eine Leistung an und suchst eine Leistung zurück. Kein Geld, keine Waren.
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-0 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              s <= step ? 'bg-[#0D9488] text-white' : 'bg-[#E5E7EB] text-[#64748B]'
            }`}>
              {s < step ? '✓' : s}
            </div>
            <div className={`flex-1 h-1 mx-2 rounded ${s < step ? 'bg-[#0D9488]' : s === 3 ? 'hidden' : 'bg-[#E5E7EB]'}`} />
          </div>
        ))}
      </div>

      {/* Step Labels */}
      <div className="flex justify-between text-xs text-[#64748B] mb-8 -mt-4">
        <span className={step >= 1 ? 'text-[#0D9488] font-medium' : ''}>Deine Leistung</span>
        <span className={step >= 2 ? 'text-[#0D9488] font-medium' : ''}>Deine Wünsche</span>
        <span className={step >= 3 ? 'text-[#0D9488] font-medium' : ''}>Überprüfen</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-[10px] px-4 py-3 text-sm text-red-800 mb-6">{error}</div>
      )}
      {warning && (
        <div className="bg-amber-50 border border-amber-200 rounded-[10px] px-4 py-3 text-sm text-amber-800 mb-6">{warning}</div>
      )}

      {/* Step 1: Your Service */}
      {step === 1 && (
        <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Titel *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder='z.B. "Webdesign gegen Umzugshilfe"'
              className="w-full px-4 py-3 border border-[#E5E7EB] rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40 focus:border-[#0D9488]" />
            <p className="text-xs text-[#64748B] mt-1">{title.length}/80 Zeichen (min. 10)</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Kategorie deiner Leistung *</label>
            <select value={offeredCategoryId} onChange={e => setOfferedCategoryId(e.target.value)}
              className="w-full px-4 py-3 border border-[#E5E7EB] rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40 focus:border-[#0D9488]">
              <option value="">Kategorie wählen...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Beschreibe deine Leistung *</label>
            <textarea value={offeredDescription} onChange={e => setOfferedDescription(e.target.value)} maxLength={2000} rows={5}
              placeholder="Was genau bietest du an? Sei möglichst konkret..."
              className="w-full px-4 py-3 border border-[#E5E7EB] rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40 focus:border-[#0D9488] resize-none" />
            <p className="text-xs text-[#64748B] mt-1">{offeredDescription.length}/2000 Zeichen (min. 50)</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Geschätzter Aufwand *</label>
            <select value={effort} onChange={e => setEffort(e.target.value)}
              className="w-full px-4 py-3 border border-[#E5E7EB] rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40 focus:border-[#0D9488]">
              <option value="">Aufwand wählen...</option>
              {EFFORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Erfahrungsniveau</label>
            <div className="flex gap-3">
              {EXPERIENCE_OPTIONS.map(o => (
                <button key={o.value} type="button" onClick={() => setExperienceLevel(experienceLevel === o.value ? '' : o.value)}
                  className={`px-4 py-2 rounded-[10px] text-sm font-medium border transition-colors ${
                    experienceLevel === o.value
                      ? 'border-[#0D9488] bg-[#F0FDFA] text-[#0D9488]'
                      : 'border-[#E5E7EB] text-[#64748B] hover:border-[#0D9488]/40'
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button onClick={() => setStep(2)} disabled={!canProceedStep1}
              className="px-8 py-3 rounded-[10px] text-sm font-semibold bg-[#0D9488] text-white hover:bg-[#0F766E] disabled:bg-[#E5E7EB] disabled:text-[#64748B] transition-colors">
              Weiter
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Your Wishes */}
      {step === 2 && (
        <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Gesuchte Gegenleistungen * (1–3 Kategorien)</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <button key={c.id} type="button" onClick={() => toggleSoughtCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    soughtCategoryIds.includes(c.id)
                      ? 'border-[#0D9488] bg-[#CCFBF1] text-[#0F766E]'
                      : 'border-[#E5E7EB] text-[#64748B] hover:border-[#0D9488]/40'
                  }`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Was stellst du dir als Gegenleistung vor? *</label>
            <textarea value={soughtDescription} onChange={e => setSoughtDescription(e.target.value)} maxLength={1000} rows={3}
              placeholder="Beschreibe, was du dir als Gegenleistung wünschst..."
              className="w-full px-4 py-3 border border-[#E5E7EB] rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40 focus:border-[#0D9488] resize-none" />
            <p className="text-xs text-[#64748B] mt-1">{soughtDescription.length}/1000 Zeichen (min. 30)</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Durchführungsort *</label>
            <div className="flex gap-3">
              {LOCATION_OPTIONS.map(o => (
                <button key={o.value} type="button" onClick={() => setLocationType(o.value)}
                  className={`px-4 py-2 rounded-[10px] text-sm font-medium border transition-colors ${
                    locationType === o.value
                      ? 'border-[#0D9488] bg-[#F0FDFA] text-[#0D9488]'
                      : 'border-[#E5E7EB] text-[#64748B] hover:border-[#0D9488]/40'
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {locationType !== 'REMOTE' && locationType && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Stadt *</label>
                <input value={city} onChange={e => setCity(e.target.value)} placeholder="Berlin"
                  className="w-full px-4 py-3 border border-[#E5E7EB] rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40 focus:border-[#0D9488]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">PLZ *</label>
                <input value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="10115" maxLength={5}
                  className="w-full px-4 py-3 border border-[#E5E7EB] rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40 focus:border-[#0D9488]" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Verfügbarkeit</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABILITY_OPTIONS.map(o => (
                <button key={o.value} type="button" onClick={() => toggleAvailability(o.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    availability.includes(o.value)
                      ? 'border-[#0D9488] bg-[#CCFBF1] text-[#0F766E]'
                      : 'border-[#E5E7EB] text-[#64748B] hover:border-[#0D9488]/40'
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Voraussetzungen</label>
            <input value={requirements} onChange={e => setRequirements(e.target.value)} maxLength={500}
              placeholder='z.B. "Auto vorhanden", "Eigenes Werkzeug"'
              className="w-full px-4 py-3 border border-[#E5E7EB] rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40 focus:border-[#0D9488]" />
          </div>

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(1)}
              className="px-6 py-3 rounded-[10px] text-sm font-medium border-2 border-[#0D9488] text-[#0F766E] hover:bg-[#F0FDFA] transition-colors">
              Zurück
            </button>
            <button onClick={() => { setError(null); setStep(3); }} disabled={!canProceedStep2}
              className="px-8 py-3 rounded-[10px] text-sm font-semibold bg-[#0D9488] text-white hover:bg-[#0F766E] disabled:bg-[#E5E7EB] disabled:text-[#64748B] transition-colors">
              Weiter
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-6">
            <h2 className="text-lg font-semibold text-[#1A2332] mb-4">Vorschau deines Angebots</h2>

            <div className="space-y-4">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#CCFBF1] text-[#115E59] mb-2">
                  {categories.find(c => c.id === offeredCategoryId)?.name}
                </span>
                <h3 className="text-xl font-bold text-[#1A2332]">{title}</h3>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-[#1A2332] mb-1">Was ich anbiete</h4>
                <p className="text-sm text-[#64748B] whitespace-pre-line">{offeredDescription}</p>
                <p className="text-xs text-[#64748B] mt-2">
                  Aufwand: {EFFORT_OPTIONS.find(o => o.value === effort)?.label}
                  {experienceLevel && ` · Erfahrung: ${EXPERIENCE_OPTIONS.find(o => o.value === experienceLevel)?.label}`}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-[#1A2332] mb-1">Was ich suche</h4>
                <div className="flex flex-wrap gap-1 mb-2">
                  {soughtCategoryIds.map(id => (
                    <span key={id} className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-[#F0FDFA] text-[#0F766E]">
                      {categories.find(c => c.id === id)?.name}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-[#64748B] whitespace-pre-line">{soughtDescription}</p>
              </div>

              <div className="text-sm text-[#64748B]">
                <p>Durchführung: {LOCATION_OPTIONS.find(o => o.value === locationType)?.label}</p>
                {city && <p>Ort: {city} {postalCode}</p>}
                {availability.length > 0 && <p>Verfügbarkeit: {availability.map(a => AVAILABILITY_OPTIONS.find(o => o.value === a)?.label).join(', ')}</p>}
                {requirements && <p>Voraussetzungen: {requirements}</p>}
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(2)}
              className="px-6 py-3 rounded-[10px] text-sm font-medium border-2 border-[#0D9488] text-[#0F766E] hover:bg-[#F0FDFA] transition-colors">
              Zurück
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="px-10 py-3 rounded-[10px] text-sm font-bold bg-[#0D9488] text-white hover:bg-[#0F766E] disabled:bg-[#E5E7EB] disabled:text-[#64748B] transition-colors">
              {submitting ? 'Wird veröffentlicht...' : 'Veröffentlichen'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/leistungstausch/erstellen.astro src/components/leistungstausch/ServiceCreateWizard.tsx
git commit -m "feat(leistungstausch): add create listing page with 3-step React wizard"
```

---

## Task 17: Homepage Teaser Banner

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Add the Leistungstausch teaser banner to the homepage**

In `src/pages/index.astro`, find the closing `</section>` of the Hero section (after the search form area). Add this new section right after it:

```astro
    <!-- Leistungstausch Teaser -->
    <section class="bg-gradient-to-r from-teal-600 to-teal-500 py-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>
                    </div>
                    <div>
                        <h2 class="text-lg font-bold text-white">NEU: Leistungstausch</h2>
                        <p class="text-sm text-white/80">Tausche deine Fähigkeiten — ohne Geld, ohne Waren.</p>
                    </div>
                </div>
                <a href="/leistungstausch" class="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-teal-700 rounded-DEFAULT text-sm font-semibold hover:bg-teal-50 transition-colors flex-shrink-0">
                    Jetzt entdecken
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>
                </a>
            </div>
        </div>
    </section>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(leistungstausch): add teal teaser banner to homepage"
```

---

## Task 18: SVG Category Icons

**Files:**
- Create: `public/icons/service/` directory with 12 SVG icons

- [ ] **Step 1: Create simple SVG icons for each service category**

Create the directory and placeholder icons. These are simple, clean inline SVGs:

```bash
mkdir -p public/icons/service
```

Create `public/icons/service/handwerk.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#0D9488" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
```

Create similar simple SVGs for: `digital.svg`, `haushalt.svg`, `garten.svg`, `transport.svg`, `nachhilfe.svg`, `kreativ.svg`, `pflege.svg`, `buero.svg`, `sport.svg`, `events.svg`, `sonstiges.svg`. Each uses `stroke="#0D9488"` for teal consistency. Use standard Lucide/Heroicon-style paths.

- [ ] **Step 2: Commit**

```bash
git add public/icons/service/
git commit -m "feat(leistungstausch): add service category SVG icons"
```

---

## Task 19: Build Verification

- [ ] **Step 1: Run the Astro build to verify everything compiles**

Run: `cd /home/exit/Dokumente/Kunden_Projekte_UVM/market-Melvin_-nderungen && npm run build`
Expected: Build completes without errors. All new pages and components are compiled.

- [ ] **Step 2: Fix any type errors or build issues**

If the build fails, read the error output and fix the specific issues. Common issues:
- Missing imports
- TypeScript type mismatches in Prisma relations
- Astro component prop types

- [ ] **Step 3: Run dev server and manually verify**

Run: `npm run dev`
Expected: Server starts on port 3000. Navigate to:
- `http://localhost:3000/leistungstausch` — Overview page loads with hero, category bar, filters, empty state
- `http://localhost:3000/leistungstausch/erstellen` — Wizard loads (redirects to login if not authenticated)

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(leistungstausch): resolve build issues from Phase 1 integration"
```
