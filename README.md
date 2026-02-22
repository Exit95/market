# Novamarkt

Sichere Kleinanzeigen-Plattform mit KYC-Verifizierung, Treuhandkonto und Käuferschutz.

**Stack:** Astro 4 SSR · Node.js Adapter · PostgreSQL 16 · Prisma ORM · TypeScript · Docker

---

## Schnellstart

### Voraussetzungen
- Node.js 20+
- Docker & Docker Compose

### Lokale Entwicklung

```bash
# 1. Repo klonen & Dependencies installieren
git clone <repo-url> && cd novamarkt
npm install

# 2. Env-Variablen setzen
cp .env.example .env
# → .env anpassen (mindestens DATABASE_URL + DB_PASSWORD)

# 3. Datenbank starten (nur DB via Docker)
docker compose up db -d

# 4. Prisma Migrationen ausführen
npm run db:migrate
# oder für schnelles Prototyping:
# npm run db:push

# 5. Entwicklungsserver starten
npm run dev
# → http://localhost:4321
```

---

## Docker Compose (Produktion / Vollstack)

```bash
# App + Datenbank starten
docker compose up --build -d

# Status prüfen
docker compose ps

# Logs ansehen
docker compose logs -f app

# Healthcheck
curl http://localhost:4321/api/health
# → { "ok": true, "service": "novamarkt", "ts": "..." }

# Stoppen
docker compose down
```

---

## Prisma

```bash
# Schema → Datenbank migrieren (Development)
npm run db:migrate
# → fragt nach Migration-Name, z.B. "init"

# Prisma Client regenerieren (nach Schema-Änderung)
npm run db:generate

# Schema direkt pushen ohne Migration (Prototyping)
npm run db:push

# Prisma Studio (Browser-UI für DB-Daten)
npx prisma studio
```

---

## Algolia Such-Index

```bash
# Alle aktiven Anzeigen aus der Datenbank in den Algolia-Index schreiben
# (einmalig beim Setup oder nach einem Datenimport ausführen)
npm run algolia:index
```

Voraussetzung: `ALGOLIA_APP_ID` und `ALGOLIA_ADMIN_KEY` müssen in `.env` gesetzt sein.

---

## Build

```bash
# Astro SSR Build
npm run build
# Output: dist/

# Build testen (standalone)
node dist/server/entry.mjs
```

---

## Env-Variablen

| Variable | Beschreibung | Pflicht |
|---|---|---|
| `DATABASE_URL` | PostgreSQL Connection String | ✅ |
| `DB_PASSWORD` | Passwort für Docker DB | ✅ |
| `APP_URL` | Öffentliche App-URL | ✅ |
| `S3_*` | S3-kompabler Object Storage | Für Foto-Upload |
| `IDNOW_*` | IDnow KYC API | Für Verifizierung |
| `MANGOPAY_*` | Mangopay Escrow | Für Zahlungen |
| `ALGOLIA_*` | Algolia Suche | Für Search |
| `SMTP_*` | E-Mail SMTP | Für Benachrichtigungen |

Alle Variablen dokumentiert in [`.env.example`](.env.example).

---

## API Endpoints

| Route | Methode | Beschreibung |
|---|---|---|
| `/api/health` | GET | Healthcheck → `{ ok: true }` |
| `/api/upload` | POST/DELETE | S3 Foto-Upload |
| `/api/search` | GET | Algolia Suche |
| `/api/kyc/start` | POST | IDnow KYC Session starten |
| `/api/kyc/webhook` | POST | IDnow Webhook |
| `/api/payment/create-payin` | POST | Mangopay Zahlung initiieren |
| `/api/payment/confirm` | POST | Warenerhalt bestätigen |
| `/api/payment/refund` | POST | Rückerstattung |
| `/api/payment/webhook` | POST | Mangopay Webhook |
| `/api/email/test` | POST | Test-E-Mail (nur Dev) |

---

## Projektstruktur

```
novamarkt/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── prisma/
│   └── schema.prisma         # DB-Schema (User, Listing, Message, Review)
├── public/
│   └── icons/                # SVG-Kategorie-Icons
├── src/
│   ├── components/           # Header, Footer, ListingCard
│   ├── data/                 # Mock-Daten (listings.ts)
│   ├── layouts/              # BaseLayout.astro
│   ├── lib/                  # s3.ts, idnow.ts, mangopay.ts, algolia.ts, mailer.ts
│   ├── pages/
│   │   ├── api/              # REST API Endpoints
│   │   ├── index.astro       # Startseite
│   │   ├── inserat/          # Inserat-Detail
│   │   ├── inserat-erstellen.astro
│   │   ├── anmelden.astro
│   │   ├── profil.astro
│   │   ├── nachrichten.astro
│   │   └── sicherheit.astro
│   └── styles/
│       └── global.css
└── astro.config.mjs
```
# market
