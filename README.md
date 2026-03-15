# 🛒 Novamarkt

> **Sichere Kleinanzeigen-Plattform** – Kaufen & Verkaufen mit Käuferschutz, KYC-Verifizierung und Echtzeit-Nachrichten.

[![Astro](https://img.shields.io/badge/Astro-5.x-FF5D01?logo=astro&logoColor=white)](https://astro.build)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma&logoColor=white)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green)](#)

---

## ✨ Features

| Feature | Beschreibung |
|---|---|
| 🔐 **Authentifizierung** | Session-basierte Auth via Lucia mit Argon2-Passwort-Hashing |
| 📦 **Inserate** | Erstellen, bearbeiten und verwalten von Kleinanzeigen mit Foto-Upload (S3) |
| 💬 **Echtzeit-Chat** | Käufer/Verkäufer-Nachrichten über Ably Realtime |
| 💳 **Treuhandzahlung** | Sichere Zahlungsabwicklung via Stripe & Mangopay |
| 🛡️ **KYC-Verifizierung** | Identitätsprüfung mit IDnow + E-Mail/Telefon-Bestätigung |
| 🔍 **Volltextsuche** | Blitzschnelle Suche über Algolia |
| 🤖 **Betrugserkennung** | Automatische Fraud-Signals mit Schweregrad-Klassifizierung |
| 👮 **Admin-Panel** | Nutzerverwaltung, Ban/Shadowban, Audit-Log, Review-Queue |
| 📊 **Trust-Score** | Reputationssystem (NEW → BASIC → VERIFIED → TRUSTED → ELITE) |
| 📧 **E-Mail** | Transaktionale E-Mails über Nodemailer/SMTP |

---

## 🏗️ Tech Stack

**Frontend & SSR**
- [Astro 5](https://astro.build) – Server-Side Rendering mit Node.js-Adapter
- Vanilla CSS – kein Framework-Overhead

**Backend & Datenbank**
- [Prisma ORM](https://prisma.io) + PostgreSQL
- [Lucia Auth](https://lucia-auth.com) – Session-Management
- [Zod](https://zod.dev) – Validierung aller API-Inputs

**Integrationen**
- **S3** (AWS / MinIO) – Foto-Upload mit Presigned URLs
- **Ably** – WebSocket-basierter Echtzeit-Chat
- **Algolia** – Suchindes für Listings
- **Stripe** – Zahlungsabwicklung & Webhooks
- **Mangopay** – Treuhandkonto & Escrow
- **IDnow** – KYC / Identitätsprüfung
- **Nodemailer** – E-Mail-Versand

---

## 📁 Projektstruktur

```
novamarkt/
├── prisma/
│   ├── schema.prisma       # Datenbank-Schema (15+ Modelle)
│   └── seed.ts             # Seed-Daten
├── src/
│   ├── components/         # Header, Footer, ListingCard
│   ├── layouts/            # BaseLayout
│   ├── lib/                # Integrations-Clients (s3, ably, algolia …)
│   ├── pages/
│   │   ├── api/            # REST-API-Routen
│   │   │   ├── auth/       # login, logout, register, me
│   │   │   ├── listings/   # CRUD Inserate
│   │   │   ├── orders/     # Bestellungen & Lieferstatus
│   │   │   ├── payment/    # Stripe / Mangopay Webhooks
│   │   │   ├── admin/      # Review-Queue, User-Actions, Audit-Log
│   │   │   └── kyc/        # IDnow KYC-Flow
│   │   ├── admin/          # Admin-Dashboard (SSR)
│   │   ├── dashboard/      # Meine Inserate
│   │   └── messages/       # Chat-Inbox & Konversationen
│   └── styles/
│       └── global.css
├── public/icons/           # Kategorie-Icons (SVG)
├── docker-compose.yml      # PostgreSQL + MinIO + App
├── Dockerfile
└── astro.config.mjs
```

---

## 🚀 Lokale Entwicklung

### Voraussetzungen

- Node.js ≥ 20
- PostgreSQL ≥ 14 (oder Docker)

### 1. Repository klonen

```bash
git clone https://github.com/Exit95/market.git
cd market
```

### 2. Abhängigkeiten installieren

```bash
npm install
```

### 3. Umgebungsvariablen konfigurieren

```bash
cp .env.example .env
# .env mit eigenen Werten befüllen
```

### 4. Datenbank starten & migrieren

**Mit Docker (empfohlen):**
```bash
docker-compose up -d db
```

**Prisma migrieren:**
```bash
npm run db:migrate
npm run db:generate
```

### 5. Dev-Server starten

```bash
npm run dev
# → http://localhost:4321
```

---

## 🐳 Docker-Deployment

Das Projekt enthält eine vollständige `docker-compose.yml` mit PostgreSQL, MinIO (S3-kompatibel) und der App:

```bash
docker-compose up --build
```

---

## 🔑 Umgebungsvariablen

| Variable | Beschreibung |
|---|---|
| `DATABASE_URL` | PostgreSQL Connection String |
| `APP_URL` | Öffentliche App-URL |
| `S3_ENDPOINT` | S3 / MinIO Endpunkt |
| `S3_BUCKET_PUBLIC` | S3-Bucket für Fotos |
| `IDNOW_API_KEY` | IDnow KYC API-Key |
| `MANGOPAY_CLIENT_ID` | Mangopay Client-ID |
| `ALGOLIA_APP_ID` | Algolia Application-ID |
| `SMTP_HOST` | SMTP-Host für E-Mail |
| `ABLY_API_KEY` | Ably Realtime API-Key |
| `STRIPE_SECRET_KEY` | Stripe Secret Key |

Vollständige Liste: [`.env.example`](.env.example)

---

## 📊 Datenbankschema (Übersicht)

```
User ──┬── Session (Lucia)
       ├── Listing ──── ListingImage (S3)
       ├── Conversation ── Message
       ├── Order ──┬── Payment (Stripe/Mangopay)
       │           └── Dispute
       ├── Verification (E-Mail / Telefon / KYC)
       ├── TrustScore
       ├── FraudSignal
       └── AuditLog / AdminAction
```

---

## 📝 API-Routen

| Method | Endpoint | Beschreibung |
|---|---|---|
| `POST` | `/api/auth/register` | Registrierung |
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/listings` | Alle Inserate |
| `POST` | `/api/listings` | Inserat erstellen |
| `GET` | `/api/search` | Algolia-Suche |
| `POST` | `/api/orders/{id}/pay` | Zahlung starten |
| `POST` | `/api/kyc/start` | KYC-Flow starten |
| `GET` | `/api/admin/review-queue` | Fraud-Review-Queue |
| `POST` | `/api/admin/users/{id}/action` | User sperren / entsperren |

---

## 📜 Lizenz

MIT © 2026 Novamarkt
