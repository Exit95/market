# Leistungstausch — Design Spec

**Datum:** 2026-04-06
**Plattform:** ehren-deal.de
**Status:** Approved

---

## 1. Strategische Empfehlung

Der Leistungstausch wird als **eigenständiger Bereich** neben dem bestehenden Warenmarktplatz integriert. Eigene Navigation, eigene URL-Struktur (`/leistungstausch/...`), eigene visuelle Identität (Teal-Akzentfarbe), aber geteilte Infrastruktur (Auth, Chat, Trust-Score, Profil).

**Architektur-Ansatz: Paralleles Modell.** Eigene Prisma-Modelle (`ServiceListing`, `ServiceDeal`, `ServiceProposal`, `ServiceCategory`) neben den bestehenden Modellen. Geteilte Infrastruktur: `User`, `Conversation`, `Message`, `Review`, `TrustScore`. Kein `if (type === 'service')` im bestehenden Code.

**Name:** "Leistungstausch" — direkt, selbsterklärend, deutsch.

---

## 2. Produktlogik

### Kernprinzip

Ausschließlich Dienstleistung gegen Dienstleistung. Kein Geld, keine Waren, keine Zuzahlungen, keine Hybridmodelle.

### Positionierung

- Eigener Bereich in der Hauptnavigation auf gleicher Ebene wie der Marktplatz
- Eigene URL-Struktur: `/leistungstausch/...`
- Eigene Teal-Akzentfarbe (#0D9488) zur visuellen Abgrenzung
- Homepage-Teaser-Banner verweist auf den Bereich
- Jede Seite im Bereich zeigt dezentes Info-Banner: "Leistungstausch — Dienstleistung gegen Dienstleistung. Ohne Geld, ohne Waren."

### Abgrenzungsmechanismen

**Strukturell:**
- Kein Preisfeld, kein Währungsfeld, kein Zahlungsbutton im Datenmodell
- Kein Zustandsfeld (Neu/Gebraucht) — kein physischer Gegenstand
- Kein Versand-/Lieferfeld — nur "Vor Ort" oder "Remote"
- Eigene Dienstleistungs-Kategorien (keine Waren-Kategorien)

**Bei der Erstellung:**
- Klares Statement zu Beginn: "Du bietest eine Leistung an und suchst eine Leistung zurück. Kein Geld, keine Waren."
- Pflichtfelder erzwingen die Struktur
- Freitextfelder mit Hinweisen versehen

**Moderation:**
- AI-Content-Scanner erkennt: Preisangaben, Warenangebote, Zuzahlungen
- Report-Grund "NICHT_DIENSTLEISTUNG" für gemeldete Inserate
- Admin-Review-Queue für gemeldete Inserate

### Dienstleistungs-Kategorien

12 eigene Kategorien, getrennt vom Warenmarktplatz:

| Kategorie | Beispiele |
|---|---|
| Handwerk & Reparatur | Möbelaufbau, Renovierung, Reparaturen |
| Digital & IT | Webdesign, Programmierung, IT-Support |
| Haushalt & Reinigung | Putzen, Aufräumen, Wäsche |
| Garten & Außenbereich | Rasenmähen, Hecke schneiden, Bepflanzung |
| Transport & Umzug | Umzugshilfe, Transporte, Entsorgung |
| Nachhilfe & Bildung | Mathe, Sprachen, Musikunterricht |
| Kreativ & Medien | Fotografie, Videoschnitt, Grafikdesign |
| Pflege & Betreuung | Kinderbetreuung, Tierbetreuung, Seniorenhilfe |
| Büro & Verwaltung | Steuerhilfe, Schreibarbeiten, Übersetzung |
| Sport & Fitness | Personal Training, Yoga, Tanzunterricht |
| Events & Unterhaltung | DJ, Moderation, Kochen für Events |
| Sonstiges | Alles was nicht passt |

---

## 3. Inseratsstruktur

### Pflichtfelder

| Feld | Typ | Beschreibung |
|---|---|---|
| Titel | Text (max 80 Zeichen) | Kurzer, prägnanter Titel. Z.B. "Webdesign gegen Umzugshilfe" |
| Angebotene Leistung | Text (50-2000 Zeichen) | Was bietest du konkret an? Detaillierte Beschreibung |
| Kategorie (angeboten) | Select (1 aus 12) | In welche Kategorie fällt deine Leistung? |
| Gesuchte Gegenleistungen | Multi-Select (1-3 aus 12) | Welche Art von Leistung suchst du zurück? |
| Gesuchte Leistung Beschreibung | Text (30-1000 Zeichen) | Was stellst du dir konkret als Gegenleistung vor? |
| Geschätzter Aufwand | Select | "Unter 1 Stunde", "1-3 Stunden", "3-8 Stunden", "Mehrere Tage", "Fortlaufend" |
| Durchführungsort | Select | "Vor Ort", "Remote", "Beides möglich" |
| Standort | Text + Geocoding | Stadt / PLZ (Pflicht bei "Vor Ort" oder "Beides", optional bei "Remote") |

### Optionale Felder

| Feld | Typ | Beschreibung |
|---|---|---|
| Bilder | Upload (max 5) | Fotos bisheriger Arbeit, Referenzen |
| Verfügbarkeit | Multi-Select | "Werktags", "Abends", "Wochenende", "Flexibel" |
| Erfahrungsniveau | Select | "Anfänger", "Fortgeschritten", "Profi" |
| Voraussetzungen | Text (max 500 Zeichen) | Was muss die andere Person mitbringen? |
| Gültig bis | Datum | Automatisch 30 Tage, anpassbar |

---

## 4. User Journey

### Kompletter Flow

```
ENTDECKEN
  Nutzer besucht /leistungstausch
  → Sieht Angebote als Karten, kann filtern & suchen
  → Öffnet Detailseite /leistungstausch/angebot/[id]
       │
       ▼
KONTAKT AUFNEHMEN
  Option 1: "Vorschlag senden" (strukturiertes Formular)
  Option 2: "Nachricht senden" (Ably-Chat für Rückfragen)
  → Im Chat bleibt "Jetzt Vorschlag senden"-Button sichtbar
       │
       ▼
VERHANDLUNG
  Empfänger erhält Benachrichtigung (E-Mail + In-App)
  → Drei Optionen:
    ✅ ANNEHMEN → Deal wird erstellt (ACTIVE)
    ↩️  GEGENVORSCHLAG → Formular vorbelegt, max 5 Runden
    ❌ ABLEHNEN → Optionaler Grund
  Parallel: Chat bleibt offen
       │
       ▼
DURCHFÜHRUNG (Deal ACTIVE)
  Beide erbringen Leistungen flexibel und unabhängig
  Jede Seite markiert unabhängig "Als erledigt"
  Bestätigungsdialog vor jeder Markierung
       │
       ▼
ABSCHLUSS (Beide completed = true)
  Deal-Status → COMPLETED
  Trust-Score +3 für beide
  Inserat-Status → COMPLETED
  Bewertungsaufforderung an beide (14-Tage-Fenster)
  Bewertungen gleichzeitig sichtbar (nach 14 Tagen oder sobald beide bewertet)
```

### Sonderfälle

**Nichterscheinen / Keine Leistung:**
- 30 Tage ohne Aktivität: Erinnerung an beide
- 45 Tage: "Deal als gescheitert markieren" angeboten
- Jederzeit: "Problem melden" → ServiceDispute

**Einvernehmliche Absage:**
- Beide können "Deal abbrechen" vorschlagen
- Andere Seite muss bestätigen
- Wenn beide zustimmen: CANCELLED, kein Trust-Score-Effekt

**Einseitig erledigt, andere Seite bestätigt nicht:**
- Nutzer B kann "Leistung nicht erhalten" klicken
- Öffnet automatisch Dispute mit Grund KEINE_LEISTUNG

**Anti-Ghosting:**
- 7 Tage nach einseitiger Bestätigung ohne Reaktion: Erinnerung
- 14 Tage: Hinweis "Du kannst einen Dispute öffnen"
- 3+ nicht-abgeschlossene Deals: Trust-Score-Malus

### Benachrichtigungen

| Event | E-Mail | In-App |
|---|---|---|
| Neuer Vorschlag erhalten | Ja | Ja |
| Vorschlag angenommen → Deal erstellt | Ja | Ja |
| Gegenvorschlag erhalten | Ja | Ja |
| Vorschlag abgelehnt | Nein | Ja |
| Gegenseite hat "erledigt" markiert | Ja | Ja |
| Deal abgeschlossen — bitte bewerten | Ja | Ja |
| Dispute eröffnet | Ja | Ja |
| Erinnerung: Deal seit 30 Tagen offen | Ja | Ja |
| Neue Chat-Nachricht | Nein | Ja |

### Deal-Status Zustandsdiagramm

```
                Proposal ACCEPTED
                      │
                      ▼
                  ┌────────┐
                  │ ACTIVE │
                  └───┬────┘
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼
    Beide Seiten   Dispute    Einvernehmlich
    bestätigen     eröffnet   abgebrochen
          │           │           │
          ▼           ▼           ▼
    ┌───────────┐ ┌──────────┐ ┌───────────┐
    │ COMPLETED │ │ DISPUTED │ │ CANCELLED │
    └───────────┘ └────┬─────┘ └───────────┘
                       │
                       ▼
                 Admin löst auf
                       │
                 ┌─────┴─────┐
                 ▼           ▼
           COMPLETED    CANCELLED
```

---

## 5. UI/UX-Konzept

### Visuelle Identität

**Akzentfarbe Leistungstausch:**
```
Teal Primary:    #0D9488 (teal-600)
Teal Dark:       #0F766E (teal-700)
Teal Light:      #CCFBF1 (teal-100, Hintergrund-Akzent)
Teal Subtle:     #F0FDFA (teal-50, großflächige Hintergründe)
```

Alle anderen Design-Tokens bleiben identisch zum Marktplatz (Inter-Font, Border-Radius 10px, Shadows, Breakpoints). Die Teal-Farbe ersetzt überall im Leistungstausch-Bereich das Primary Blue.

**Design-Anspruch:** Premium, professionell, selbstbewusst. Mutige Typografie, großzügiger Whitespace, starke visuelle Hierarchie, Micro-Interactions. Muss sich deutlich von generischen Kleinanzeigen abheben.

### Seitenstruktur

#### Übersichtsseite `/leistungstausch`

- **Hero-Bereich:** Teal-Gradient-Hintergrund, große Headline "Leistung gegen Leistung", Subline "Biete was du kannst. Bekomme was du brauchst. Ohne Geld. Ohne Waren.", Suchfeld + CTA "Angebot erstellen"
- **Kategorie-Leiste:** Horizontale Scroll-Leiste mit Icons + Namen der 12 Kategorien
- **Filter-Leiste:** Kategorie (angeboten), Kategorie (gesucht), Ort/PLZ, Radius, Vor Ort/Remote, Aufwand, Verfügbarkeit, Sortierung. Primäre Filter sichtbar, sekundäre hinter "Mehr Filter"
- **Karten-Grid:** 3 Spalten Desktop, 2 Tablet, 1 Mobil. Infinite Scroll oder "Mehr laden"

#### Angebotskarte

Jede Karte zeigt:
- Titel als "X gegen Y"-Format (prominent)
- Kategorie-Badge der angebotenen Leistung (teal)
- Gesuchte Kategorien als kleine Tags
- Aufwand-Icon mit Zeitangabe
- Ort mit Icon (Pinnadel/Bildschirm)
- Trust-Badge (wenn verifiziert)
- Durchschnittsbewertung (oder "Neu")
- Optional: Bild (sonst Kategorie-Illustration)

#### Detailseite `/leistungstausch/angebot/[id]`

- **2/3 Hauptbereich:** Kategorie-Badge, Titel, "Was ich anbiete" (mit Aufwand + Erfahrung), "Was ich suche" (Kategorien + Beschreibung), Voraussetzungen, Bilder/Referenzen
- **1/3 Sidebar:** Anbieter-Karte (Avatar, Name, Bewertung, Verifizierungen, Mitglied seit), "Nachricht senden" + "Vorschlag senden" Buttons, Detail-Box (Ort, Durchführung, Aufwand, Verfügbarkeit, Gültig bis), Melden-Link
- **Unten:** Ähnliche Angebote (3 Karten)

#### Erstellungsmaske `/leistungstausch/erstellen`

3-Schritte-Wizard:
1. **Deine Leistung:** Titel, Kategorie, Beschreibung, Aufwand, Erfahrungsniveau, Bilder
2. **Deine Wünsche:** Gesuchte Kategorien (Multi-Select 1-3), Beschreibung Gegenleistung, Durchführungsort, Standort, Verfügbarkeit, Voraussetzungen
3. **Überprüfen:** Vorschau der fertigen Karte + "Veröffentlichen"

Info-Banner oben: "Du bietest eine Leistung an und suchst eine Leistung zurück. Kein Geld, keine Waren."

#### Vorschlags-Dialog (Modal/Slide-Over)

Felder:
- Kontext: Was der Inserat-Ersteller sucht (vorangestellt)
- "Dein Angebot": Beschreibung, Kategorie, Aufwand
- "Deine Erwartung": Beschreibung (vorbelegt aus Inserat), Aufwand
- "Wann & Wo": Durchführung, Zeitraum, Treffpunkt
- Persönliche Nachricht (optional)
- CTA: "Vorschlag senden"

#### Deal-Statusseite `/leistungstausch/deals/[id]`

Zwei-Spalten-Layout:
- **Links: "Deine Leistung"** — Kategorie, Beschreibung, Aufwand, Status (Noch offen / Erledigt), Button "Als erledigt markieren"
- **Rechts: "Gegenleistung von [Name]"** — Gleiche Struktur, Status der anderen Seite
- **Darunter:** Vereinbarungs-Details (Zeitraum, Ort, Datum), eingebetteter Chat, Aktionen (Deal abbrechen, Problem melden)

#### Bewertungs-Dialog (Modal nach Abschluss)

- Gesamtbewertung (1-5 Sterne, Pflicht)
- Qualität der Leistung (1-5, optional)
- Zuverlässigkeit (1-5, optional)
- Kommunikation (1-5, optional)
- Kommentar (Freitext, optional)
- Hinweis: "Sichtbar sobald beide bewertet haben oder nach 14 Tagen"

### Responsive Design

- **Desktop:** 3-spaltige Karten-Grid, Sidebar auf Detailseiten
- **Tablet:** 2-spaltige Karten-Grid, Sidebar unter Hauptinhalt
- **Mobil:** 1-spaltige Karten, Full-Width Formular, Bottom-Sheet statt Modal

### Homepage-Integration

Neuer Teaser-Abschnitt auf `/` mit Teal-Hintergrund, visuell abgesetzt:
"NEU: Leistungstausch — Tausche deine Fähigkeiten — ohne Geld, ohne Waren" + CTA "Jetzt entdecken"

---

## 6. Datenmodell

### Neue Prisma-Modelle

```prisma
// ─── Leistungstausch-Kategorien ───

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
}

// ─── Leistungstausch-Inserate ───

model ServiceListing {
  id                 String               @id @default(cuid())
  title              String
  offeredDescription String               @db.Text
  soughtDescription  String               @db.Text
  effort             ServiceEffort
  locationType       ServiceLocationType
  city               String?
  postalCode         String?
  latitude           Float?
  longitude          Float?
  availability       String?              // JSON array
  experienceLevel    ServiceExperienceLevel?
  requirements       String?
  expiresAt          DateTime
  status             ServiceListingStatus @default(ACTIVE)
  viewCount          Int                  @default(0)
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt

  userId             String
  user               User                 @relation(fields: [userId], references: [id])
  offeredCategoryId  String
  offeredCategory    ServiceCategory      @relation("OfferedCategory", fields: [offeredCategoryId], references: [id])
  soughtCategories   ServiceListingSoughtCategory[]
  images             ServiceListingImage[]
  proposals          ServiceProposal[]
  reports            ServiceListingReport[]

  @@index([userId])
  @@index([offeredCategoryId])
  @@index([status, createdAt])
  @@index([latitude, longitude])
}

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

// ─── M:N Gesuchte Kategorien ───

model ServiceListingSoughtCategory {
  id               String         @id @default(cuid())
  serviceListingId String
  serviceListing   ServiceListing @relation(fields: [serviceListingId], references: [id], onDelete: Cascade)
  categoryId       String
  category         ServiceCategory @relation(fields: [categoryId], references: [id])

  @@unique([serviceListingId, categoryId])
}

// ─── Bilder ───

model ServiceListingImage {
  id               String         @id @default(cuid())
  serviceListingId String
  serviceListing   ServiceListing @relation(fields: [serviceListingId], references: [id], onDelete: Cascade)
  url              String
  position         Int            @default(0)
  createdAt        DateTime       @default(now())
}

// ─── Vorschläge ───

model ServiceProposal {
  id                String              @id @default(cuid())
  serviceListingId  String
  serviceListing    ServiceListing      @relation(fields: [serviceListingId], references: [id])
  proposerId        String
  proposer          User                @relation("ServiceProposalsSent", fields: [proposerId], references: [id])
  receiverId        String
  receiver          User                @relation("ServiceProposalsReceived", fields: [receiverId], references: [id])
  offeredDescription String             @db.Text
  offeredCategoryId String
  offeredEffort     ServiceEffort
  soughtDescription String              @db.Text
  soughtEffort      ServiceEffort
  locationType      ServiceLocationType
  proposedLocation  String?
  proposedTimeframe String?
  message           String?             @db.Text
  status            ServiceProposalStatus @default(PENDING)
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  deal              ServiceDeal?
  parentProposalId  String?
  parentProposal    ServiceProposal?    @relation("CounterProposals", fields: [parentProposalId], references: [id])
  counterProposals  ServiceProposal[]   @relation("CounterProposals")

  @@index([serviceListingId])
  @@index([proposerId])
  @@index([receiverId])
}

enum ServiceProposalStatus {
  PENDING
  ACCEPTED
  DECLINED
  COUNTERED
  WITHDRAWN
  EXPIRED
}

// ─── Deals ───

model ServiceDeal {
  id                String          @id @default(cuid())
  proposalId        String          @unique
  proposal          ServiceProposal @relation(fields: [proposalId], references: [id])
  partyAId          String
  partyA            User            @relation("ServiceDealsAsPartyA", fields: [partyAId], references: [id])
  partyBId          String
  partyB            User            @relation("ServiceDealsAsPartyB", fields: [partyBId], references: [id])
  partyACompleted   Boolean         @default(false)
  partyACompletedAt DateTime?
  partyBCompleted   Boolean         @default(false)
  partyBCompletedAt DateTime?
  cancelRequestedBy String?
  status            ServiceDealStatus @default(ACTIVE)
  completedAt       DateTime?
  cancelledAt       DateTime?
  cancelReason      String?
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  reviews           ServiceReview[]
  dispute           ServiceDispute?

  @@index([partyAId])
  @@index([partyBId])
}

enum ServiceDealStatus {
  ACTIVE
  COMPLETED
  DISPUTED
  CANCELLED
}

// ─── Bewertungen ───

model ServiceReview {
  id                  String      @id @default(cuid())
  dealId              String
  deal                ServiceDeal @relation(fields: [dealId], references: [id])
  reviewerId          String
  reviewer            User        @relation("ServiceReviewsGiven", fields: [reviewerId], references: [id])
  revieweeId          String
  reviewee            User        @relation("ServiceReviewsReceived", fields: [revieweeId], references: [id])
  rating              Int
  comment             String?     @db.Text
  qualityRating       Int?
  reliabilityRating   Int?
  communicationRating Int?
  createdAt           DateTime    @default(now())

  @@unique([dealId, reviewerId])
  @@index([revieweeId])
}

// ─── Disputes ───

model ServiceDispute {
  id          String               @id @default(cuid())
  dealId      String               @unique
  deal        ServiceDeal          @relation(fields: [dealId], references: [id])
  openedById  String
  openedBy    User                 @relation(fields: [openedById], references: [id])
  reason      ServiceDisputeReason
  description String               @db.Text
  status      ServiceDisputeStatus @default(OPEN)
  resolution  String?              @db.Text
  resolvedAt  DateTime?
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt
}

enum ServiceDisputeReason {
  NICHT_ERSCHIENEN
  LEISTUNG_MANGELHAFT
  ANDERE_LEISTUNG
  KEINE_LEISTUNG
  KOMMUNIKATION
  SONSTIGES
}

enum ServiceDisputeStatus {
  OPEN
  UNDER_REVIEW
  RESOLVED
  CLOSED
}

// ─── Reports ───

model ServiceListingReport {
  id               String              @id @default(cuid())
  serviceListingId String
  serviceListing   ServiceListing      @relation(fields: [serviceListingId], references: [id])
  reporterId       String
  reporter         User                @relation(fields: [reporterId], references: [id])
  reason           ServiceReportReason
  description      String?
  status           String              @default("OPEN")
  createdAt        DateTime            @default(now())

  @@unique([serviceListingId, reporterId])
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

// ─── Optionales Leistungsprofil ───

model ServiceProfile {
  id           String   @id @default(cuid())
  userId       String   @unique
  user         User     @relation(fields: [userId], references: [id])
  bio          String?  @db.Text
  skills       String?  // JSON array
  availability String?  // JSON array
  responseTime String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### User-Modell Erweiterung (nur Relations)

```prisma
model User {
  // ... bestehende Felder bleiben unverändert ...

  // Neue Relations für Leistungstausch
  serviceListings          ServiceListing[]
  serviceProposalsSent     ServiceProposal[]      @relation("ServiceProposalsSent")
  serviceProposalsReceived ServiceProposal[]      @relation("ServiceProposalsReceived")
  serviceDealsAsPartyA     ServiceDeal[]          @relation("ServiceDealsAsPartyA")
  serviceDealsAsPartyB     ServiceDeal[]          @relation("ServiceDealsAsPartyB")
  serviceReviewsGiven      ServiceReview[]        @relation("ServiceReviewsGiven")
  serviceReviewsReceived   ServiceReview[]        @relation("ServiceReviewsReceived")
  serviceDisputes          ServiceDispute[]
  serviceListingReports    ServiceListingReport[]
  serviceProfile           ServiceProfile?
}
```

### Kernprinzipien

- **Kein Preisfeld** — strukturell unmöglich, Geld ins System zu bringen
- **Symmetrische Deals** — `partyA`/`partyB` statt `buyer`/`seller`
- **Unabhängige Bestätigung** — separate Booleans, COMPLETED erst wenn beide true
- **Vorschlag → Deal Pipeline** — ACCEPTED Proposal erzeugt genau einen Deal
- **Gegenvorschläge als Kette** — `parentProposalId` für Verhandlungshistorie

---

## 7. Technische Architektur

### Dateistruktur

```
src/
├── pages/
│   ├── leistungstausch/
│   │   ├── index.astro                    # Übersicht mit Suche & Filter
│   │   ├── erstellen.astro                # 3-Schritte-Wizard
│   │   ├── angebot/
│   │   │   └── [id].astro                 # Angebots-Detailseite
│   │   └── deals/
│   │       ├── index.astro                # Meine Deals
│   │       └── [id].astro                 # Deal-Detail mit Status & Chat
│   │
│   └── api/
│       └── leistungstausch/
│           ├── listings.ts                # GET (suchen), POST (erstellen)
│           ├── listings/
│           │   └── [id].ts                # GET, PUT, DELETE
│           ├── proposals.ts               # POST (senden)
│           ├── proposals/
│           │   └── [id].ts                # PUT (annehmen/ablehnen/kontern)
│           ├── deals.ts                   # GET (meine Deals)
│           ├── deals/
│           │   ├── [id].ts                # GET (Detail)
│           │   └── [id]/
│           │       ├── complete.ts        # POST (erledigt markieren)
│           │       ├── cancel.ts          # POST (abbrechen)
│           │       └── dispute.ts         # POST (Dispute)
│           ├── reviews.ts                 # POST (bewerten)
│           ├── categories.ts              # GET (Kategorien)
│           ├── reports.ts                 # POST (melden)
│           └── profile.ts                 # GET/PUT (Leistungsprofil)
│
├── components/
│   └── leistungstausch/
│       ├── ServiceCard.astro              # Angebotskarte
│       ├── ServiceHero.astro              # Hero-Bereich
│       ├── ServiceFilters.astro           # Filter-Leiste
│       ├── ServiceCategoryBar.astro       # Kategorie-Scroll-Leiste
│       ├── ServiceDetail.astro            # Detailseite Hauptbereich
│       ├── ServiceProviderCard.astro      # Anbieter-Sidebar-Karte
│       ├── ServiceCreateWizard.tsx        # React: 3-Schritte-Formular
│       ├── ServiceProposalModal.tsx        # React: Vorschlags-Dialog
│       ├── ServiceDealStatus.tsx           # React: Deal-Status mit Live-Updates
│       ├── ServiceReviewModal.tsx          # React: Bewertungs-Dialog
│       └── ServiceDealChat.tsx             # React: Chat im Deal (Ably)
│
├── lib/
│   ├── service-content-filter.ts          # Diskriminierung + Geld/Waren-Erkennung
│   ├── service-validation.ts              # Zod-Schemas
│   └── service-notifications.ts           # E-Mail-Templates
│
└── data/
    └── service-categories.ts              # Seed-Daten für 12 Kategorien
```

### API-Endpunkte

#### Inserate

| Methode | Pfad | Auth | Beschreibung |
|---|---|---|---|
| GET | `/api/leistungstausch/listings` | Nein | Suchen/Filtern. Query: query, offeredCategory, soughtCategory, city, lat, lng, radius, locationType, effort, availability, experienceLevel, verifiedOnly, sortBy, page, pageSize. Rate: 20/min |
| POST | `/api/leistungstausch/listings` | Ja | Erstellen. Body: alle Pflichtfelder. Validierung: Zod + Content-Filter. Max 5 aktive pro User |
| GET | `/api/leistungstausch/listings/[id]` | Nein | Detail. Seiteneffekt: viewCount++ |
| PUT | `/api/leistungstausch/listings/[id]` | Ersteller | Bearbeiten. Content-Filter |
| DELETE | `/api/leistungstausch/listings/[id]` | Ersteller/Admin | Status → REMOVED |

#### Vorschläge

| Methode | Pfad | Auth | Beschreibung |
|---|---|---|---|
| POST | `/api/leistungstausch/proposals` | Ja | Vorschlag senden. Content-Filter. Max 10 offene. Nicht eigenes Inserat |
| PUT | `/api/leistungstausch/proposals/[id]` | Empfänger/Absender | accept (→ Deal), decline, withdraw. Gegenvorschlag = neuer POST mit parentProposalId, max 5 Runden |

#### Deals

| Methode | Pfad | Auth | Beschreibung |
|---|---|---|---|
| GET | `/api/leistungstausch/deals` | Ja | Meine Deals (als partyA oder partyB) |
| GET | `/api/leistungstausch/deals/[id]` | partyA/partyB | Detail mit Proposal, Users, Reviews |
| POST | `/api/leistungstausch/deals/[id]/complete` | partyA/partyB | Eigene Seite als erledigt. Wenn beide: COMPLETED, Trust +3 |
| POST | `/api/leistungstausch/deals/[id]/cancel` | partyA/partyB | Cancel-Request. Erster speichert Intent, zweiter führt aus |
| POST | `/api/leistungstausch/deals/[id]/dispute` | partyA/partyB | Dispute öffnen. Deal → DISPUTED |

#### Bewertungen, Reports, Kategorien, Profil

| Methode | Pfad | Auth | Beschreibung |
|---|---|---|---|
| POST | `/api/leistungstausch/reviews` | Ja | Bewertung. Deal muss COMPLETED. Content-Filter auf Kommentar |
| POST | `/api/leistungstausch/reports` | Ja | Inserat melden. Bei 3+ Reports → pausieren |
| GET | `/api/leistungstausch/categories` | Nein | Alle 12 Kategorien |
| GET/PUT | `/api/leistungstausch/profile` | Ja | Leistungsprofil lesen/bearbeiten |

### Validierung (Zod)

```typescript
// Listing-Erstellung
const ServiceListingCreateSchema = z.object({
  title: z.string().min(10).max(80),
  offeredDescription: z.string().min(50).max(2000),
  offeredCategoryId: z.string().cuid(),
  soughtCategoryIds: z.array(z.string().cuid()).min(1).max(3),
  soughtDescription: z.string().min(30).max(1000),
  effort: z.nativeEnum(ServiceEffort),
  locationType: z.nativeEnum(ServiceLocationType),
  city: z.string().max(100).optional(),
  postalCode: z.string().regex(/^\d{5}$/).optional(),
  availability: z.array(z.enum(["WERKTAGS","ABENDS","WOCHENENDE","FLEXIBEL"])).optional(),
  experienceLevel: z.nativeEnum(ServiceExperienceLevel).optional(),
  requirements: z.string().max(500).optional(),
}).refine(data => {
  if (data.locationType !== "REMOTE") return !!data.city && !!data.postalCode;
  return true;
}, { message: "Stadt und PLZ sind bei Vor-Ort-Leistungen erforderlich" });
```

### Content-Filter-Pipeline

Jeder Text durchläuft vor Veröffentlichung:

```
1. DISKRIMINIERUNG (Hard Block)
   Rassismus, Sexismus, Homophobie, Transphobie, Antisemitismus,
   rechtsextreme Codes (88, 14 words), kodierte Sprache,
   ethnische/religiöse Ausschlüsse, Altersdiskriminierung,
   Behindertenfeindlichkeit
   → Bei Treffer: Block + Meldung + bei 3+ Versuchen: Sperre

2. GELD/WAREN (Hard Block)
   €, EUR, "verkaufe", "OVP", "Versand", "Zuzahlung", "Stundenlohn"
   → Block + Hinweis an Nutzer

3. UNZULÄSSIG (Soft Block → Admin)
   Illegale/anstößige Dienstleistungen, medizinisch reguliert
   → Zur Moderation

4. QUALITÄT (Warnung)
   Zu vage, Spam, Duplikate
   → Warnung + Verbesserungsvorschlag
```

Gilt für: Inserat-Titel, Beschreibungen, Voraussetzungen, Vorschlagstexte, Chat-Nachrichten, Bewertungskommentare.

### Algolia-Index

Neuer Index `service_listings` (getrennt von `listings`):

```typescript
searchableAttributes: ["title", "offeredDescription", "soughtDescription",
                       "offeredCategory", "soughtCategories", "city"]
attributesForFaceting: ["offeredCategory", "soughtCategories", "effort",
                        "locationType", "availability", "experienceLevel",
                        "userVerified"]
```

### E-Mail-Templates

```
service-proposal-received      — "Du hast einen Vorschlag erhalten"
service-proposal-accepted      — "Deal steht!"
service-proposal-countered     — "Gegenvorschlag erhalten"
service-proposal-declined      — "Vorschlag nicht angenommen"
service-deal-completed         — "Deal abgeschlossen — jetzt bewerten!"
service-deal-reminder          — "Dein Deal wartet auf Aktivität"
service-deal-disputed          — "Ein Dispute wurde eröffnet"
service-party-completed        — "Dein Partner hat erledigt markiert"
service-ghosting-reminder      — "Bitte reagiere auf deinen offenen Deal"
```

### Rate Limits

| Aktion | Limit |
|---|---|
| Suche | 20/min pro IP |
| Inserat erstellen | Max 5 aktive pro User |
| Vorschläge senden | Max 10 offene pro User |
| Aktive Deals | Max 3 pro User |
| Neue Nutzer (Trust NEW) | Max 1 Inserat, max 3 Vorschläge |

---

## 8. Sicherheits- und Vertrauensmechanismen

### Trust-Score-Erweiterung

Bestehende Berechnung bleibt. Neue Leistungstausch-Faktoren:

| Faktor | Punkte |
|---|---|
| Abgeschlossene Service-Deals | +3 pro Deal (max +15) |
| Durchschnittsbewertung >= 4.0 | +5 |
| Leistungsprofil ausgefüllt | +5 |
| Service-Dispute (als Verursacher) | -10 |

### Anti-Diskriminierung

Hard Block auf allen Textfeldern:
- Rassistische Begriffe, Slurs, kodierte Sprache
- Ethnische/religiöse Einschränkungen ("nur für Deutsche", "keine Ausländer")
- Geschlechtsdiskriminierung (außer sachlich begründet)
- Altersdiskriminierung
- Behindertenfeindlichkeit
- Homophobie, Transphobie
- Antisemitismus (auch kodiert)
- Rechtsextreme Codes und Symbole

Bei Treffer: Inhalt blockiert, klare Fehlermeldung, bei 3+ Versuchen automatische Sperre + Admin-Meldung.

Report-Grund DISKRIMINIERUNG wird priorisiert in Admin-Queue behandelt.

### Deal-Absicherung

- COMPLETED erst wenn beide Parteien unabhängig bestätigt haben
- Zeitliche Absicherung: 30-Tage-Erinnerung, 45-Tage-Gescheitert-Option
- Anti-Ghosting: 7-Tage-Erinnerung nach einseitiger Bestätigung, 14 Tage Dispute-Hinweis, 3+ Ghost-Deals → Trust-Malus

### Melden-Funktion

Report-Gründe: NICHT_DIENSTLEISTUNG, DISKRIMINIERUNG, SPAM, BETRUG, UNANGEMESSEN, DUPLIKAT, SONSTIGES.

3+ Reports → automatisch pausiert → Admin-Queue.

### Moderation

- Admin-Dashboard: Neuer Tab "Leistungstausch"
- Review-Queue für gemeldete Inserate (DISKRIMINIERUNG priorisiert)
- Dispute-Queue für offene Disputes
- Aktionen: Inserat entfernen, Nutzer verwarnen, Nutzer für Leistungstausch sperren, Dispute auflösen
- Statistiken: aktive Inserate, Deals/Woche, Dispute-Rate, häufigste Kategorien

### Nutzungsbedingungen (Erweiterung)

```
Im Bereich Leistungstausch gilt:
✗ Keine Warenangebote
✗ Keine Geldleistungen oder Zuzahlungen
✗ Keine diskriminierenden Inhalte oder Einschränkungen
✗ Keine illegalen oder medizinisch regulierten Dienstleistungen
✗ Keine sexuellen Dienstleistungen
✗ Keine Mehrfach-Inserate für dieselbe Leistung
✗ Kein Missbrauch des Bewertungssystems
✓ Nur echte, persönlich erbringbare Dienstleistungen
✓ Ehrliche Beschreibung von Aufwand und Erfahrung
✓ Respektvoller Umgang — keine Diskriminierung
✓ Verbindlichkeit nach Deal-Annahme
```

---

## 9. Matching & Filter

### Filter-System

**Primäre Filter (immer sichtbar):**
- Kategorie (angeboten) — Single-Select
- Kategorie (gesucht) — Single-Select ("Zeig mir Leute, die X suchen")
- Standort — Text + Autocomplete
- Radius — 5km, 10km, 25km, 50km, 100km, Egal
- Durchführung — Vor Ort, Remote, Beides

**Sekundäre Filter (hinter "Mehr Filter"):**
- Aufwand — Multi-Select
- Verfügbarkeit — Multi-Select
- Erfahrungsniveau — Multi-Select
- Nur verifizierte Anbieter — Toggle
- Sortierung — Neueste, Relevanz, Bewertung, Entfernung

**Besonderheit: Doppel-Kategorie-Filter.** Filtern nach "bietet X" UND "sucht Y" gleichzeitig möglich.

### Intelligentes Matching (Phase 5)

Automatische Suche nach gegenseitigen Matches:
- Nutzer A bietet X, sucht Y
- System findet Nutzer die Y anbieten und X suchen
- Benachrichtigung: "Nutzer C bietet genau was du suchst und sucht was du anbietest!"

Matching-Score:
- Kategorie-Match: +50
- Aufwand-Ähnlichkeit: +20
- Standort-Nähe: +15
- Durchführungsart-Match: +10
- Trust-Score: +5

---

## 10. Einführungsphasen

### Phase 1: Basis (MVP)
Inserate erstellen, durchsuchen, kontaktieren.
- Schema: ServiceCategory, ServiceListing, ServiceListingSoughtCategory, ServiceListingImage, ServiceListingReport
- Seed: 12 Kategorien
- Seiten: Übersicht, Erstellen, Detail
- API: Listings CRUD, Categories, Reports
- Content-Filter (Diskriminierung, Geld/Waren)
- Navigation + Homepage-Teaser
- Algolia-Index
- Rate Limiting

### Phase 2: Vorschläge & Chat
Strukturierte Vorschläge, Verhandlung, Gegenvorschläge.
- Schema: ServiceProposal
- API: Proposals CRUD
- Vorschlags-Modal
- Ably-Chat-Integration
- E-Mail-Benachrichtigungen

### Phase 3: Deal-Tracking
Aktive Deals verfolgen, Leistungen bestätigen.
- Schema: ServiceDeal
- Seiten: Meine Deals, Deal-Detail
- API: Deals CRUD, Complete, Cancel
- Unabhängige Bestätigung
- Erinnerungen + Anti-Ghosting
- Trust-Score-Integration

### Phase 4: Bewertungen & Disputes
Vertrauen aufbauen, Konflikte lösen.
- Schema: ServiceReview, ServiceDispute
- API: Reviews, Disputes
- Bewertungs-Modal
- Gleichzeitige Enthüllung
- Admin: Dispute-Queue

### Phase 5: Matching & Profil
Intelligente Vermittlung, professionellere Profile.
- Schema: ServiceProfile
- API: Profile
- Matching-Algorithmus
- Benachrichtigungen
- Leistungsprofil

### Abhängigkeiten

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
```

Jede Phase ist eigenständig auslieferbar und nutzbar.

---

## 11. Konkrete Empfehlungen für ehren-deal.de

1. **Phase 1 zuerst live bringen** — auch ohne Deals und Vorschläge ist die Übersichtsseite mit Inseraten + Chat-Kontaktaufnahme bereits nutzbar und testbar mit echten Nutzern.

2. **Content-Filter von Tag 1** — Diskriminierung und Geld/Waren-Erkennung muss ab Phase 1 aktiv sein. Sonst kippt der Bereich sofort.

3. **Teal-Branding konsequent** — der visuelle Unterschied zum Marktplatz muss auf den ersten Blick erkennbar sein. Kein halbherziges Umfärben.

4. **Doppel-Kategorie-Filter als Killer-Feature** — kein anderer Marktplatz bietet "Zeig mir wer X anbietet und Y sucht". Das ist der strukturelle Vorteil gegenüber Freitext-Plattformen.

5. **Bewertungs-Enthüllung gleichzeitig** — verhindert Vergeltungsbewertungen und fördert ehrliches Feedback. Kritisch für Vertrauensaufbau.

6. **Max-Limits niedrig halten** — 5 Inserate, 10 Vorschläge, 3 Deals. Lieber restriktiv starten und bei Bedarf öffnen, als Spam-Probleme nachträglich einzudämmen.

7. **Anti-Ghosting ernst nehmen** — bei einem geldfreien System ist Ghosting das größte Risiko. Die Trust-Score-Malus bei wiederholtem Nicht-Erscheinen sind essentiell.

8. **Admin-Tooling parallel mitbauen** — jede Phase braucht ihre Admin-Werkzeuge. Nicht nachträglich draufpacken.
