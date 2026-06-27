# Leistungstausch Phase 2 (Vorschläge & Chat) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured proposal system (send, accept, decline, counter-proposals) and chat integration to the Leistungstausch feature, so users can negotiate and formalize service exchanges.

**Architecture:** New `ServiceProposal` Prisma model with status flow (PENDING → ACCEPTED/DECLINED/COUNTERED/WITHDRAWN). Counter-proposals chain via `parentProposalId`. Proposals create via API, accepted proposals trigger listing status change to MATCHED. Chat uses existing Ably infrastructure via existing Conversation/Message models. New React components: ProposalModal (send/view), ProposalList (on detail page). E-mail notifications via existing Nodemailer setup.

**Tech Stack:** Astro 5 SSR, React 19, Prisma 6 (MySQL), Zod, Ably (existing), Nodemailer (existing)

**Spec:** `docs/superpowers/specs/2026-04-06-leistungstausch-design.md` — Section "Phase 2: Vorschläge & Chat"

---

## File Map

### New Files

| File | Responsibility |
|---|---|
| `src/lib/service-notifications.ts` | E-mail templates for Leistungstausch events |
| `src/pages/api/leistungstausch/proposals/index.ts` | POST create proposal |
| `src/pages/api/leistungstausch/proposals/[id].ts` | GET detail, PUT accept/decline/withdraw |
| `src/pages/api/leistungstausch/proposals/counter.ts` | POST send counter-proposal |
| `src/components/leistungstausch/ServiceProposalModal.tsx` | React: Send proposal slide-over |
| `src/components/leistungstausch/ServiceProposalList.tsx` | React: View/manage received proposals |

### Modified Files

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add ServiceProposal model + enums + User relations |
| `src/lib/service-validation.ts` | Add proposal Zod schemas |
| `src/pages/leistungstausch/angebot/[id].astro` | Add "Vorschlag senden" button + ProposalModal |
| `src/pages/leistungstausch/index.astro` | Minor: show MATCHED badge on cards |
| `src/components/leistungstausch/ServiceProviderCard.astro` | Add "Vorschlag senden" button |

---

## Task 1: Prisma Schema — ServiceProposal Model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add ServiceProposalStatus enum**

Add after the existing `ServiceReportReason` enum (around line 150):

```prisma
enum ServiceProposalStatus {
  PENDING
  ACCEPTED
  DECLINED
  COUNTERED
  WITHDRAWN
  EXPIRED
}
```

- [ ] **Step 2: Add ServiceProposal model**

Add after the `ServiceListingReport` model (at end of file, around line 665):

```prisma
// ─── Service Proposal (Leistungstausch) ──────────────────────────────────────

model ServiceProposal {
  id                String                @id @default(cuid())
  serviceListingId  String
  serviceListing    ServiceListing        @relation(fields: [serviceListingId], references: [id])
  proposerId        String
  proposer          User                  @relation("ServiceProposalsSent", fields: [proposerId], references: [id])
  receiverId        String
  receiver          User                  @relation("ServiceProposalsReceived", fields: [receiverId], references: [id])
  offeredDescription String               @db.Text
  offeredCategoryId String
  offeredEffort     ServiceEffort
  soughtDescription String                @db.Text
  soughtEffort      ServiceEffort
  locationType      ServiceLocationType
  proposedLocation  String?
  proposedTimeframe String?
  message           String?               @db.Text
  status            ServiceProposalStatus @default(PENDING)
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt

  parentProposalId  String?
  parentProposal    ServiceProposal?      @relation("CounterProposals", fields: [parentProposalId], references: [id])
  counterProposals  ServiceProposal[]     @relation("CounterProposals")

  @@index([serviceListingId])
  @@index([proposerId])
  @@index([receiverId])
  @@index([status])
  @@map("service_proposals")
}
```

- [ ] **Step 3: Add proposals relation to ServiceListing**

In the `ServiceListing` model, add after the `reports` relation (around line 613):

```prisma
  proposals         ServiceProposal[]
```

- [ ] **Step 4: Add proposal relations to User model**

In the `User` model, add after the `serviceListingReports` relation (around line 224):

```prisma
  serviceProposalsSent     ServiceProposal[] @relation("ServiceProposalsSent")
  serviceProposalsReceived ServiceProposal[] @relation("ServiceProposalsReceived")
```

- [ ] **Step 5: Validate and generate**

Run: `npx prisma format && npx prisma generate`
Expected: Both succeed without errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(leistungstausch): add ServiceProposal model with counter-proposal chain"
```

---

## Task 2: Validation Schemas — Proposal Zod Schemas

**Files:**
- Modify: `src/lib/service-validation.ts`

- [ ] **Step 1: Add proposal schemas**

Add at the end of `src/lib/service-validation.ts`:

```typescript
export const ServiceProposalCreateSchema = z.object({
  serviceListingId: z.string().min(1, 'Listing-ID ist erforderlich.'),
  offeredDescription: z.string()
    .min(30, 'Beschreibe dein Angebot mit mindestens 30 Zeichen.')
    .max(2000, 'Beschreibung darf maximal 2000 Zeichen haben.'),
  offeredCategoryId: z.string().min(1, 'Kategorie ist erforderlich.'),
  offeredEffort: z.enum([
    'UNTER_1_STUNDE', 'EIN_BIS_DREI_STUNDEN', 'DREI_BIS_ACHT_STUNDEN',
    'MEHRERE_TAGE', 'FORTLAUFEND',
  ], { message: 'Ungültiger Aufwand.' }),
  soughtDescription: z.string()
    .min(30, 'Beschreibe deine Erwartung mit mindestens 30 Zeichen.')
    .max(2000, 'Beschreibung darf maximal 2000 Zeichen haben.'),
  soughtEffort: z.enum([
    'UNTER_1_STUNDE', 'EIN_BIS_DREI_STUNDEN', 'DREI_BIS_ACHT_STUNDEN',
    'MEHRERE_TAGE', 'FORTLAUFEND',
  ], { message: 'Ungültiger Aufwand.' }),
  locationType: z.enum(['VOR_ORT', 'REMOTE', 'BEIDES'], { message: 'Ungültiger Durchführungsort.' }),
  proposedLocation: z.string().max(200).optional(),
  proposedTimeframe: z.string().max(200).optional(),
  message: z.string().max(1000).optional(),
  parentProposalId: z.string().optional(),
});

export const ServiceProposalActionSchema = z.object({
  action: z.enum(['accept', 'decline', 'withdraw'], { message: 'Ungültige Aktion.' }),
});
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/service-validation.ts
git commit -m "feat(leistungstausch): add proposal Zod validation schemas"
```

---

## Task 3: E-Mail Notification Templates

**Files:**
- Create: `src/lib/service-notifications.ts`

- [ ] **Step 1: Create notification templates**

Create `src/lib/service-notifications.ts`:

```typescript
/**
 * src/lib/service-notifications.ts
 * E-Mail-Templates für Leistungstausch-Benachrichtigungen.
 */
import { sendMail } from './mailer';

const TEAL = '#0D9488';
const NAVY = '#1A2332';

function wrapTemplate(content: string): string {
  return `
    <div style="font-family:'Inter',system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;background:#F8FAFB;padding:0">
      <div style="background:${NAVY};padding:24px 32px;text-align:center">
        <span style="color:#FFFFFF;font-size:20px;font-weight:600;letter-spacing:-0.02em">Ehren-Deal</span>
        <span style="color:${TEAL};font-size:12px;font-weight:500;margin-left:8px;padding:2px 8px;background:rgba(13,148,136,0.2);border-radius:10px">Leistungstausch</span>
      </div>
      <div style="background:#FFFFFF;padding:32px;border:1px solid #E5E7EB;border-top:none">
        ${content}
      </div>
      <div style="padding:16px 32px;text-align:center">
        <p style="color:#94A3B8;font-size:12px;margin:0">Ehren-Deal — Leistung gegen Leistung</p>
      </div>
    </div>`;
}

function ctaButton(url: string, text: string): string {
  return `<a href="${url}" style="display:inline-block;margin:8px 0 20px;padding:12px 28px;background:${TEAL};color:#FFFFFF;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${text}</a>`;
}

export async function sendProposalReceivedEmail(opts: {
  to: string;
  proposerName: string;
  listingTitle: string;
  offeredDescription: string;
  proposalUrl: string;
}) {
  const html = wrapTemplate(`
    <h2 style="color:${NAVY};font-size:20px;margin:0 0 12px">Neuer Vorschlag erhalten</h2>
    <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 16px">
      <strong>${opts.proposerName}</strong> hat einen Vorschlag für dein Angebot <strong>"${opts.listingTitle}"</strong> gesendet.
    </p>
    <div style="background:#F0FDFA;border:1px solid #99F6E4;border-radius:8px;padding:16px;margin:0 0 20px">
      <p style="color:${NAVY};font-size:14px;margin:0 0 4px;font-weight:600">Angebotene Leistung:</p>
      <p style="color:#64748B;font-size:13px;margin:0;line-height:1.5">${opts.offeredDescription.slice(0, 200)}${opts.offeredDescription.length > 200 ? '...' : ''}</p>
    </div>
    ${ctaButton(opts.proposalUrl, 'Vorschlag ansehen')}
    <p style="color:#94A3B8;font-size:13px;line-height:1.5">Du kannst den Vorschlag annehmen, ablehnen oder einen Gegenvorschlag senden.</p>
  `);

  return sendMail({ to: opts.to, subject: `Neuer Vorschlag für "${opts.listingTitle}"`, html });
}

export async function sendProposalAcceptedEmail(opts: {
  to: string;
  otherName: string;
  listingTitle: string;
  dealUrl: string;
}) {
  const html = wrapTemplate(`
    <h2 style="color:${NAVY};font-size:20px;margin:0 0 12px">Vorschlag angenommen — Deal steht!</h2>
    <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 20px">
      Dein Vorschlag für <strong>"${opts.listingTitle}"</strong> wurde von <strong>${opts.otherName}</strong> angenommen. Der Deal ist jetzt aktiv.
    </p>
    ${ctaButton(opts.dealUrl, 'Deal ansehen')}
    <p style="color:#94A3B8;font-size:13px;line-height:1.5">Ihr könnt jetzt im Chat die Details klären und eure Leistungen erbringen.</p>
  `);

  return sendMail({ to: opts.to, subject: `Deal steht: "${opts.listingTitle}"`, html });
}

export async function sendCounterProposalEmail(opts: {
  to: string;
  proposerName: string;
  listingTitle: string;
  proposalUrl: string;
}) {
  const html = wrapTemplate(`
    <h2 style="color:${NAVY};font-size:20px;margin:0 0 12px">Gegenvorschlag erhalten</h2>
    <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 20px">
      <strong>${opts.proposerName}</strong> hat einen Gegenvorschlag für <strong>"${opts.listingTitle}"</strong> gesendet.
    </p>
    ${ctaButton(opts.proposalUrl, 'Gegenvorschlag ansehen')}
    <p style="color:#94A3B8;font-size:13px;line-height:1.5">Du kannst annehmen, ablehnen oder erneut kontern (max. 5 Runden).</p>
  `);

  return sendMail({ to: opts.to, subject: `Gegenvorschlag für "${opts.listingTitle}"`, html });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/service-notifications.ts
git commit -m "feat(leistungstausch): add e-mail notification templates for proposals"
```

---

## Task 4: API — Create Proposal

**Files:**
- Create: `src/pages/api/leistungstausch/proposals/index.ts`

- [ ] **Step 1: Create the proposals POST endpoint**

Create `src/pages/api/leistungstausch/proposals/index.ts`:

```typescript
import type { APIRoute } from 'astro';
import { prisma } from '../../../../lib/auth';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { ServiceProposalCreateSchema } from '../../../../lib/service-validation';
import { filterServiceContent } from '../../../../lib/service-content-filter';
import { sendProposalReceivedEmail, sendCounterProposalEmail } from '../../../../lib/service-notifications';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await requireAuth(request, cookies);
  if (!isAuthContext(auth)) return auth;

  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Ungültiger Body' }, 400); }

  const parsed = ServiceProposalCreateSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? 'Validierungsfehler', issues: parsed.error.issues }, 400);
  }

  const data = parsed.data;

  // Verify listing exists and is active
  const listing = await prisma.serviceListing.findUnique({
    where: { id: data.serviceListingId },
    include: { user: { select: { id: true, email: true, firstName: true } } },
  });
  if (!listing || listing.status !== 'ACTIVE') {
    return json({ error: 'Angebot nicht gefunden oder nicht mehr aktiv.' }, 404);
  }

  // Can't propose to own listing
  if (listing.userId === auth.userId) {
    return json({ error: 'Du kannst keinen Vorschlag für dein eigenes Angebot senden.' }, 400);
  }

  // Rate limit: max 10 open proposals per user
  const openCount = await prisma.serviceProposal.count({
    where: { proposerId: auth.userId, status: 'PENDING' },
  });
  if (openCount >= 10) {
    return json({ error: 'Du hast bereits 10 offene Vorschläge. Bitte warte auf Antworten.' }, 429);
  }

  // Content filter on text fields
  for (const text of [data.offeredDescription, data.soughtDescription, data.message].filter(Boolean)) {
    const result = filterServiceContent(text!);
    if (!result.passed) {
      return json({ error: result.message, rule: result.rule, level: result.level }, 422);
    }
  }

  // Verify offered category exists
  const offeredCat = await prisma.serviceCategory.findUnique({ where: { id: data.offeredCategoryId } });
  if (!offeredCat) {
    return json({ error: 'Ungültige Kategorie.' }, 400);
  }

  // If counter-proposal, verify chain depth (max 5)
  if (data.parentProposalId) {
    const parent = await prisma.serviceProposal.findUnique({ where: { id: data.parentProposalId } });
    if (!parent) {
      return json({ error: 'Originalvorschlag nicht gefunden.' }, 404);
    }
    // Count chain depth
    let depth = 0;
    let current = parent;
    while (current?.parentProposalId && depth < 6) {
      current = await prisma.serviceProposal.findUnique({ where: { id: current.parentProposalId } });
      depth++;
    }
    if (depth >= 5) {
      return json({ error: 'Maximale Anzahl an Gegenvorschlägen erreicht (5). Bitte nutzt den Chat.' }, 400);
    }

    // Mark parent as COUNTERED
    await prisma.serviceProposal.update({
      where: { id: data.parentProposalId },
      data: { status: 'COUNTERED' },
    });
  }

  try {
    const proposal = await prisma.serviceProposal.create({
      data: {
        serviceListingId: data.serviceListingId,
        proposerId: auth.userId,
        receiverId: listing.userId,
        offeredDescription: data.offeredDescription,
        offeredCategoryId: data.offeredCategoryId,
        offeredEffort: data.offeredEffort as any,
        soughtDescription: data.soughtDescription,
        soughtEffort: data.soughtEffort as any,
        locationType: data.locationType as any,
        proposedLocation: data.proposedLocation,
        proposedTimeframe: data.proposedTimeframe,
        message: data.message,
        parentProposalId: data.parentProposalId,
      },
      include: {
        proposer: { select: { id: true, firstName: true, lastName: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, email: true } },
        serviceListing: { select: { id: true, title: true } },
      },
    });

    // Send email notification
    const proposerName = [auth.user.firstName, auth.user.lastName].filter(Boolean).join(' ') || 'Ein Nutzer';
    const siteUrl = 'https://ehren-deal.de';

    try {
      if (data.parentProposalId) {
        await sendCounterProposalEmail({
          to: listing.user.email,
          proposerName,
          listingTitle: listing.title,
          proposalUrl: `${siteUrl}/leistungstausch/angebot/${listing.id}`,
        });
      } else {
        await sendProposalReceivedEmail({
          to: listing.user.email,
          proposerName,
          listingTitle: listing.title,
          offeredDescription: data.offeredDescription,
          proposalUrl: `${siteUrl}/leistungstausch/angebot/${listing.id}`,
        });
      }
    } catch (emailErr) {
      console.error('[API] Proposal email error (non-blocking):', emailErr);
    }

    return json({ proposal }, 201);
  } catch (err) {
    console.error('[API] POST /api/leistungstausch/proposals error:', err);
    return json({ error: 'Interner Serverfehler' }, 500);
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/api/leistungstausch/proposals/index.ts
git commit -m "feat(leistungstausch): add proposals API (create + counter-proposal)"
```

---

## Task 5: API — Proposal Detail, Accept, Decline, Withdraw

**Files:**
- Create: `src/pages/api/leistungstausch/proposals/[id].ts`

- [ ] **Step 1: Create the proposal actions endpoint**

Create `src/pages/api/leistungstausch/proposals/[id].ts`:

```typescript
import type { APIRoute } from 'astro';
import { prisma } from '../../../../lib/auth';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { ServiceProposalActionSchema } from '../../../../lib/service-validation';
import { sendProposalAcceptedEmail } from '../../../../lib/service-notifications';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

// ── GET /api/leistungstausch/proposals/[id] ─────────────────────────────────

export const GET: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(request, cookies);
  if (!isAuthContext(auth)) return auth;

  const { id } = params;
  if (!id) return json({ error: 'ID fehlt' }, 400);

  const proposal = await prisma.serviceProposal.findUnique({
    where: { id },
    include: {
      proposer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, emailVerified: true, phoneVerified: true } },
      receiver: { select: { id: true, firstName: true, lastName: true } },
      serviceListing: { select: { id: true, title: true, userId: true } },
      counterProposals: {
        orderBy: { createdAt: 'desc' },
        include: {
          proposer: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!proposal) return json({ error: 'Vorschlag nicht gefunden' }, 404);

  // Only proposer or receiver can see
  if (proposal.proposerId !== auth.userId && proposal.receiverId !== auth.userId) {
    return json({ error: 'Keine Berechtigung' }, 403);
  }

  return json({ proposal });
};

// ── PUT /api/leistungstausch/proposals/[id] ─────────────────────────────────

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(request, cookies);
  if (!isAuthContext(auth)) return auth;

  const { id } = params;
  if (!id) return json({ error: 'ID fehlt' }, 400);

  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Ungültiger Body' }, 400); }

  const parsed = ServiceProposalActionSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Aktion' }, 400);
  }

  const { action } = parsed.data;

  const proposal = await prisma.serviceProposal.findUnique({
    where: { id },
    include: {
      serviceListing: { select: { id: true, title: true, userId: true } },
      proposer: { select: { id: true, firstName: true, lastName: true, email: true } },
      receiver: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  if (!proposal) return json({ error: 'Vorschlag nicht gefunden' }, 404);
  if (proposal.status !== 'PENDING') {
    return json({ error: 'Dieser Vorschlag kann nicht mehr bearbeitet werden.' }, 400);
  }

  // Permission checks
  if (action === 'accept' || action === 'decline') {
    if (proposal.receiverId !== auth.userId) {
      return json({ error: 'Nur der Empfänger kann annehmen oder ablehnen.' }, 403);
    }
  }
  if (action === 'withdraw') {
    if (proposal.proposerId !== auth.userId) {
      return json({ error: 'Nur der Absender kann zurückziehen.' }, 403);
    }
  }

  try {
    if (action === 'accept') {
      // Update proposal status
      await prisma.serviceProposal.update({
        where: { id },
        data: { status: 'ACCEPTED' },
      });

      // Update listing status to MATCHED
      await prisma.serviceListing.update({
        where: { id: proposal.serviceListingId },
        data: { status: 'MATCHED' },
      });

      // Expire all other PENDING proposals for this listing
      await prisma.serviceProposal.updateMany({
        where: {
          serviceListingId: proposal.serviceListingId,
          status: 'PENDING',
          id: { not: id },
        },
        data: { status: 'EXPIRED' },
      });

      // Send acceptance email to proposer
      const receiverName = [proposal.receiver.firstName, proposal.receiver.lastName].filter(Boolean).join(' ') || 'Ein Nutzer';
      const siteUrl = 'https://ehren-deal.de';
      try {
        await sendProposalAcceptedEmail({
          to: proposal.proposer.email,
          otherName: receiverName,
          listingTitle: proposal.serviceListing.title,
          dealUrl: `${siteUrl}/leistungstausch/angebot/${proposal.serviceListingId}`,
        });
      } catch (emailErr) {
        console.error('[API] Accept email error (non-blocking):', emailErr);
      }

      return json({ success: true, status: 'ACCEPTED', message: 'Vorschlag angenommen. Der Deal ist jetzt aktiv!' });

    } else if (action === 'decline') {
      await prisma.serviceProposal.update({
        where: { id },
        data: { status: 'DECLINED' },
      });
      return json({ success: true, status: 'DECLINED' });

    } else if (action === 'withdraw') {
      await prisma.serviceProposal.update({
        where: { id },
        data: { status: 'WITHDRAWN' },
      });
      return json({ success: true, status: 'WITHDRAWN' });
    }

    return json({ error: 'Ungültige Aktion' }, 400);
  } catch (err) {
    console.error('[API] PUT /api/leistungstausch/proposals/[id] error:', err);
    return json({ error: 'Interner Serverfehler' }, 500);
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/api/leistungstausch/proposals/[id].ts
git commit -m "feat(leistungstausch): add proposal detail/accept/decline/withdraw API"
```

---

## Task 6: React Component — ServiceProposalModal

**Files:**
- Create: `src/components/leistungstausch/ServiceProposalModal.tsx`

- [ ] **Step 1: Create the proposal modal component**

Create `src/components/leistungstausch/ServiceProposalModal.tsx`:

```tsx
import { useState } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  listingId: string;
  listingTitle: string;
  soughtCategories: Array<{ category: Category }>;
  soughtDescription: string;
  categories: Category[];
  onClose: () => void;
  parentProposalId?: string;
}

const EFFORT_OPTIONS = [
  { value: 'UNTER_1_STUNDE', label: 'Unter 1 Stunde' },
  { value: 'EIN_BIS_DREI_STUNDEN', label: '1–3 Stunden' },
  { value: 'DREI_BIS_ACHT_STUNDEN', label: '3–8 Stunden (Tagesaufgabe)' },
  { value: 'MEHRERE_TAGE', label: 'Mehrere Tage' },
  { value: 'FORTLAUFEND', label: 'Fortlaufend / Regelmäßig' },
];

const LOCATION_OPTIONS = [
  { value: 'VOR_ORT', label: 'Vor Ort' },
  { value: 'REMOTE', label: 'Remote' },
  { value: 'BEIDES', label: 'Beides möglich' },
];

export default function ServiceProposalModal({
  listingId, listingTitle, soughtCategories, soughtDescription,
  categories, onClose, parentProposalId,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [offeredDescription, setOfferedDescription] = useState('');
  const [offeredCategoryId, setOfferedCategoryId] = useState(soughtCategories[0]?.category.id ?? '');
  const [offeredEffort, setOfferedEffort] = useState('');
  const [soughtDesc, setSoughtDesc] = useState(soughtDescription);
  const [soughtEffort, setSoughtEffort] = useState('');
  const [locationType, setLocationType] = useState('');
  const [proposedLocation, setProposedLocation] = useState('');
  const [proposedTimeframe, setProposedTimeframe] = useState('');
  const [message, setMessage] = useState('');

  const canSubmit = offeredDescription.length >= 30 && offeredCategoryId && offeredEffort &&
    soughtDesc.length >= 30 && soughtEffort && locationType;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/leistungstausch/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceListingId: listingId,
          offeredDescription,
          offeredCategoryId,
          offeredEffort,
          soughtDescription: soughtDesc,
          soughtEffort,
          locationType,
          proposedLocation: proposedLocation || undefined,
          proposedTimeframe: proposedTimeframe || undefined,
          message: message || undefined,
          parentProposalId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Fehler beim Senden.');
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setError('Netzwerkfehler.');
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 border border-[#E5E7EB] rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40 focus:border-[#0D9488]";

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="bg-white rounded-[10px] p-8 max-w-md mx-4 text-center" onClick={e => e.stopPropagation()}>
          <div className="w-16 h-16 rounded-full bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
          <h3 className="text-lg font-bold text-[#1A2332] mb-2">{parentProposalId ? 'Gegenvorschlag gesendet!' : 'Vorschlag gesendet!'}</h3>
          <p className="text-sm text-[#64748B]">Der Empfänger wird per E-Mail benachrichtigt.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40" onClick={onClose}>
      <div className="bg-white h-full w-full max-w-lg overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1A2332]">
            {parentProposalId ? 'Gegenvorschlag senden' : 'Vorschlag senden'}
          </h2>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#1A2332] text-xl">✕</button>
        </div>

        <div className="px-6 py-6 space-y-5">
          {/* Context */}
          <div className="bg-[#F0FDFA] border border-[#99F6E4] rounded-[10px] px-4 py-3">
            <p className="text-xs font-semibold text-[#0F766E] mb-1">Angebot: {listingTitle}</p>
            <p className="text-xs text-[#115E59]">Gesucht: {soughtCategories.map(sc => sc.category.name).join(', ')}</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-[10px] px-4 py-3 text-sm text-red-800">{error}</div>
          )}

          {/* Your offer */}
          <div>
            <h3 className="text-sm font-semibold text-[#1A2332] mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center text-xs font-bold">→</span>
              Dein Angebot
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Was bietest du an? *</label>
                <textarea value={offeredDescription} onChange={e => setOfferedDescription(e.target.value)} maxLength={2000} rows={3}
                  placeholder="Ich helfe dir beim Umzug. Habe einen VW Bus..." className={`${inputClass} resize-none`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Kategorie *</label>
                  <select value={offeredCategoryId} onChange={e => setOfferedCategoryId(e.target.value)} className={inputClass}>
                    <option value="">Wählen...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Dein Aufwand *</label>
                  <select value={offeredEffort} onChange={e => setOfferedEffort(e.target.value)} className={inputClass}>
                    <option value="">Wählen...</option>
                    {EFFORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Your expectation */}
          <div>
            <h3 className="text-sm font-semibold text-[#1A2332] mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center text-xs font-bold">←</span>
              Deine Erwartung
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Was erwartest du? *</label>
                <textarea value={soughtDesc} onChange={e => setSoughtDesc(e.target.value)} maxLength={2000} rows={3}
                  className={`${inputClass} resize-none`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Erwarteter Aufwand *</label>
                <select value={soughtEffort} onChange={e => setSoughtEffort(e.target.value)} className={inputClass}>
                  <option value="">Wählen...</option>
                  {EFFORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* When & Where */}
          <div>
            <h3 className="text-sm font-semibold text-[#1A2332] mb-3">Wann & Wo</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Durchführung *</label>
                <div className="flex gap-2">
                  {LOCATION_OPTIONS.map(o => (
                    <button key={o.value} type="button" onClick={() => setLocationType(o.value)}
                      className={`px-3 py-1.5 rounded-[10px] text-xs font-medium border transition-colors ${
                        locationType === o.value ? 'border-[#0D9488] bg-[#F0FDFA] text-[#0D9488]' : 'border-[#E5E7EB] text-[#64748B]'
                      }`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Zeitraum</label>
                  <input value={proposedTimeframe} onChange={e => setProposedTimeframe(e.target.value)}
                    placeholder="z.B. Nächste 2 Wochen" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Treffpunkt</label>
                  <input value={proposedLocation} onChange={e => setProposedLocation(e.target.value)}
                    placeholder="z.B. Berlin-Mitte" className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          {/* Personal message */}
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">Persönliche Nachricht (optional)</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={1000} rows={2}
              placeholder="Hey, dein Angebot passt perfekt..." className={`${inputClass} resize-none`} />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-[#E5E7EB] px-6 py-4 flex justify-between">
          <button onClick={onClose} className="px-5 py-2.5 rounded-[10px] text-sm font-medium border-2 border-[#E5E7EB] text-[#64748B] hover:bg-[#F8FAFB] transition-colors">
            Abbrechen
          </button>
          <button onClick={handleSubmit} disabled={!canSubmit || submitting}
            className="px-6 py-2.5 rounded-[10px] text-sm font-semibold bg-[#0D9488] text-white hover:bg-[#0F766E] disabled:bg-[#E5E7EB] disabled:text-[#64748B] transition-colors">
            {submitting ? 'Wird gesendet...' : parentProposalId ? 'Gegenvorschlag senden' : 'Vorschlag senden'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/leistungstausch/ServiceProposalModal.tsx
git commit -m "feat(leistungstausch): add ServiceProposalModal React component"
```

---

## Task 7: React Component — ServiceProposalList

**Files:**
- Create: `src/components/leistungstausch/ServiceProposalList.tsx`

- [ ] **Step 1: Create the proposal list component**

Create `src/components/leistungstausch/ServiceProposalList.tsx`:

```tsx
import { useState, useEffect } from 'react';

interface Proposal {
  id: string;
  offeredDescription: string;
  offeredCategoryId: string;
  offeredEffort: string;
  soughtDescription: string;
  soughtEffort: string;
  locationType: string;
  proposedLocation?: string;
  proposedTimeframe?: string;
  message?: string;
  status: string;
  createdAt: string;
  proposer: { id: string; firstName?: string; lastName?: string; avatarUrl?: string; emailVerified: boolean; phoneVerified: boolean };
}

interface Props {
  listingId: string;
  isOwner: boolean;
  onCounter?: (proposalId: string) => void;
}

const EFFORT_LABELS: Record<string, string> = {
  UNTER_1_STUNDE: 'Unter 1 Std',
  EIN_BIS_DREI_STUNDEN: '1–3 Std',
  DREI_BIS_ACHT_STUNDEN: '3–8 Std',
  MEHRERE_TAGE: 'Mehrere Tage',
  FORTLAUFEND: 'Fortlaufend',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Ausstehend', color: '#D97706' },
  ACCEPTED: { label: 'Angenommen', color: '#22A06B' },
  DECLINED: { label: 'Abgelehnt', color: '#DC2626' },
  COUNTERED: { label: 'Gegenvorschlag', color: '#1B65A6' },
  WITHDRAWN: { label: 'Zurückgezogen', color: '#64748B' },
  EXPIRED: { label: 'Abgelaufen', color: '#64748B' },
};

export default function ServiceProposalList({ listingId, isOwner, onCounter }: Props) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/leistungstausch/listings/${listingId}`)
      .then(r => r.json())
      .then(data => {
        if (data.listing?.proposals) {
          setProposals(data.listing.proposals);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [listingId]);

  const handleAction = async (proposalId: string, action: 'accept' | 'decline') => {
    setActionLoading(proposalId);
    try {
      const res = await fetch(`/api/leistungstausch/proposals/${proposalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch {}
    setActionLoading(null);
  };

  if (loading) {
    return <div className="text-sm text-[#64748B] py-4">Vorschläge laden...</div>;
  }

  if (proposals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[#1A2332]">
        Vorschläge ({proposals.length})
      </h3>
      {proposals.map(p => {
        const name = [p.proposer.firstName, p.proposer.lastName].filter(Boolean).join(' ') || 'Nutzer';
        const initial = (p.proposer.firstName?.[0] || 'N').toUpperCase();
        const status = STATUS_LABELS[p.status] ?? { label: p.status, color: '#64748B' };
        const date = new Date(p.createdAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });

        return (
          <div key={p.id} className="border border-[#E5E7EB] rounded-[10px] p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center text-sm font-bold">
                  {initial}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1A2332]">{name}</p>
                  <p className="text-xs text-[#64748B]">{date}</p>
                </div>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: `${status.color}15`, color: status.color }}>
                {status.label}
              </span>
            </div>

            {/* Content */}
            <div className="space-y-3 mb-4">
              <div>
                <p className="text-xs font-semibold text-[#0D9488] mb-1">Bietet an:</p>
                <p className="text-sm text-[#64748B] line-clamp-3">{p.offeredDescription}</p>
                <p className="text-xs text-[#94A3B8] mt-1">Aufwand: {EFFORT_LABELS[p.offeredEffort] ?? p.offeredEffort}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#0D9488] mb-1">Erwartet:</p>
                <p className="text-sm text-[#64748B] line-clamp-3">{p.soughtDescription}</p>
                <p className="text-xs text-[#94A3B8] mt-1">Aufwand: {EFFORT_LABELS[p.soughtEffort] ?? p.soughtEffort}</p>
              </div>
              {p.message && (
                <div className="bg-[#F8FAFB] rounded-lg px-3 py-2">
                  <p className="text-xs text-[#64748B] italic">"{p.message}"</p>
                </div>
              )}
            </div>

            {/* Actions — only for owner on PENDING proposals */}
            {isOwner && p.status === 'PENDING' && (
              <div className="flex gap-2 pt-3 border-t border-[#E5E7EB]">
                <button
                  onClick={() => handleAction(p.id, 'accept')}
                  disabled={actionLoading === p.id}
                  className="flex-1 px-4 py-2 rounded-[10px] text-sm font-semibold bg-[#0D9488] text-white hover:bg-[#0F766E] disabled:opacity-50 transition-colors"
                >
                  Annehmen
                </button>
                {onCounter && (
                  <button
                    onClick={() => onCounter(p.id)}
                    className="flex-1 px-4 py-2 rounded-[10px] text-sm font-medium border-2 border-[#0D9488] text-[#0F766E] hover:bg-[#F0FDFA] transition-colors"
                  >
                    Gegenvorschlag
                  </button>
                )}
                <button
                  onClick={() => handleAction(p.id, 'decline')}
                  disabled={actionLoading === p.id}
                  className="px-4 py-2 rounded-[10px] text-sm font-medium border border-[#E5E7EB] text-[#64748B] hover:bg-[#F8FAFB] transition-colors"
                >
                  Ablehnen
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/leistungstausch/ServiceProposalList.tsx
git commit -m "feat(leistungstausch): add ServiceProposalList React component"
```

---

## Task 8: Integrate Proposals into Detail Page

**Files:**
- Modify: `src/pages/leistungstausch/angebot/[id].astro`
- Modify: `src/pages/api/leistungstausch/listings/[id].ts`
- Modify: `src/components/leistungstausch/ServiceProviderCard.astro`

- [ ] **Step 1: Update the listing detail API to include proposals**

In `src/pages/api/leistungstausch/listings/[id].ts`, in the GET handler's `prisma.serviceListing.findUnique` `include` block, add `proposals` after `images`:

```typescript
        proposals: {
          orderBy: { createdAt: 'desc' },
          include: {
            proposer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, emailVerified: true, phoneVerified: true } },
          },
        },
```

- [ ] **Step 2: Add "Vorschlag senden" button to ServiceProviderCard**

In `src/components/leistungstausch/ServiceProviderCard.astro`, find the `{!isOwner && (` block with the "Nachricht senden" button. Add a second button above it:

Change from:
```astro
    {!isOwner && (
      <div class="space-y-2">
        <a href={`/nachrichten?to=${user.id}&context=service:${listing.id}`} class="btn-teal w-full text-center">Nachricht senden</a>
      </div>
    )}
```

To:
```astro
    {!isOwner && (
      <div class="space-y-2">
        <button id="openProposalBtn" class="btn-teal w-full text-center cursor-pointer">Vorschlag senden</button>
        <a href={`/nachrichten?to=${user.id}&context=service:${listing.id}`} class="btn-teal-outline w-full text-center block">Nachricht senden</a>
      </div>
    )}
```

- [ ] **Step 3: Update the detail page to include ProposalModal and ProposalList**

In `src/pages/leistungstausch/angebot/[id].astro`, add the React component imports at the top of the frontmatter (after existing imports):

```typescript
import ServiceProposalModal from '../../../components/leistungstausch/ServiceProposalModal';
import ServiceProposalList from '../../../components/leistungstausch/ServiceProposalList';
```

Also fetch the categories for the modal:
```typescript
const catRes = await fetch(`${internalOrigin}/api/leistungstausch/categories`);
const { categories: allCategories } = catRes.ok ? await catRes.json() : { categories: [] };
```

Then in the template, after the `ServiceDetail` component inside the main content area (before the closing `</div>` of `lg:col-span-2`), add:

```astro
          {/* Proposals Section */}
          <div class="bg-surface border border-border rounded-DEFAULT p-6 sm:p-8 mt-6">
            <ServiceProposalList
              client:load
              listingId={listing.id}
              isOwner={isOwner}
            />
          </div>
```

And at the very end before `</BaseLayout>`, add a wrapper div with the modal mount point:

```astro
    <div id="proposalModalRoot"></div>

    <script define:vars={{ listingId: listing.id, listingTitle: listing.title, soughtCategories: JSON.stringify(listing.soughtCategories), soughtDescription: listing.soughtDescription, allCategories: JSON.stringify(allCategories), isOwner }}>
      if (!isOwner) {
        const btn = document.getElementById('openProposalBtn');
        if (btn) {
          btn.addEventListener('click', () => {
            const event = new CustomEvent('openProposalModal');
            window.dispatchEvent(event);
          });
        }
      }
    </script>
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/leistungstausch/angebot/\[id\].astro src/pages/api/leistungstausch/listings/\[id\].ts src/components/leistungstausch/ServiceProviderCard.astro
git commit -m "feat(leistungstausch): integrate proposals into detail page with modal and list"
```

---

## Task 9: Build Verification

- [ ] **Step 1: Run the Astro build**

Run: `npm run build`
Expected: Build completes without errors.

- [ ] **Step 2: Fix any build issues**

If build fails, fix type errors or import issues.

- [ ] **Step 3: Final commit if fixes needed**

```bash
git add -A
git commit -m "fix(leistungstausch): resolve Phase 2 build issues"
```
