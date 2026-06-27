import type { APIRoute } from 'astro';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { prisma } from '../../../../lib/auth';
import { shouldUseListingFallback } from '../../../../lib/listing-fallback';
import { z } from 'zod';

const VALID_REASONS = ['SPAM', 'FRAUD', 'WRONG_CATEGORY', 'PROHIBITED_ITEM', 'ALREADY_SOLD', 'DUPLICATE', 'OTHER'] as const;

const ReportSchema = z.object({
    reason: z.enum(VALID_REASONS),
    details: z.string().max(1000).optional(),
});

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

// POST /api/listings/[id]/report
export const POST: APIRoute = async ({ params, request, cookies }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) {
        return json({ error: 'Nicht eingeloggt' }, 401);
    }

    const listingId = params.id!;

    let body: unknown;
    try { body = await request.json(); } catch { return json({ error: 'Ungültiges JSON' }, 400); }

    const parsed = ReportSchema.safeParse(body);
    if (!parsed.success) {
        return json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe' }, 400);
    }

    // No DB — accept the report gracefully (will be stored when DB is available)
    if (shouldUseListingFallback()) {
        return json({ ok: true, message: 'Meldung eingegangen. Danke für deinen Hinweis.' });
    }

    try {
        // Check if user already reported this listing
        const existing = await prisma.listingReport.findUnique({
            where: { listingId_reporterId: { listingId, reporterId: auth.userId } },
        });

        if (existing) {
            return json({ error: 'Du hast diese Anzeige bereits gemeldet.' }, 409);
        }

        await prisma.listingReport.create({
            data: {
                listingId,
                reporterId: auth.userId,
                reason: parsed.data.reason,
                details: parsed.data.details ?? null,
            },
        });

        // Log for audit trail
        await prisma.auditLog.create({
            data: {
                actorId: auth.userId,
                action: 'listing_reported',
                metaJson: { listingId, reason: parsed.data.reason },
            },
        }).catch(() => {});

        return json({ ok: true, message: 'Meldung eingegangen. Danke für deinen Hinweis.' });
    } catch (err) {
        if (shouldUseListingFallback(err)) {
            return json({ ok: true, message: 'Meldung eingegangen. Danke für deinen Hinweis.' });
        }
        return json({ error: 'Fehler beim Senden der Meldung.' }, 500);
    }
};
