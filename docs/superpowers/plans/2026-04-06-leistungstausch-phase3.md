# Leistungstausch Phase 3 (Deal-Tracking) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a proposal is accepted, automatically create a ServiceDeal. Users can track deals, mark their side as completed, request cancellation, and view deal status. Trust-Score integration (+3 on completion).

**Architecture:** New `ServiceDeal` Prisma model created automatically when a proposal is accepted. Deal page shows two-column layout (your service / their service) with independent completion tracking. Deal APIs handle complete, cancel, and status. Proposal accept logic creates the deal. Notification emails for deal events.

**Tech Stack:** Astro 5 SSR, React 19, Prisma 6 (MySQL), Zod, Nodemailer

---

## File Map

### New Files

| File | Responsibility |
|---|---|
| `src/pages/api/leistungstausch/deals/index.ts` | GET my deals |
| `src/pages/api/leistungstausch/deals/[id].ts` | GET deal detail |
| `src/pages/api/leistungstausch/deals/[id]/complete.ts` | POST mark my side complete |
| `src/pages/api/leistungstausch/deals/[id]/cancel.ts` | POST request/confirm cancel |
| `src/components/leistungstausch/ServiceDealStatus.tsx` | React: Deal status with completion buttons |
| `src/pages/leistungstausch/deals/index.astro` | My deals list page |
| `src/pages/leistungstausch/deals/[id].astro` | Deal detail page |

### Modified Files

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add ServiceDeal model + enums + relations |
| `src/lib/service-validation.ts` | Add deal Zod schemas |
| `src/lib/service-notifications.ts` | Add deal email templates |
| `src/pages/api/leistungstausch/proposals/[id].ts` | Create ServiceDeal on accept |
| `src/components/Header.astro` | Add "Meine Deals" link in user dropdown |

---

## Tasks

### Task 1: Prisma Schema — ServiceDeal Model
### Task 2: Validation + Notification Extensions
### Task 3: Update Proposal Accept to Create Deal
### Task 4: Deal APIs (list, detail, complete, cancel)
### Task 5: ServiceDealStatus React Component
### Task 6: Deal Pages (list + detail)
### Task 7: Header — Add Deals Link
### Task 8: Build Verification
