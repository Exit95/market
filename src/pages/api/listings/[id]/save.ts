import type { APIRoute } from 'astro';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { prisma } from '../../../../lib/auth';
import { shouldUseListingFallback } from '../../../../lib/listing-fallback';

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

// GET /api/listings/[id]/save — check if saved
export const GET: APIRoute = async ({ params, request, cookies }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return json({ saved: false });

    const listingId = params.id!;

    try {
        const saved = await prisma.savedListing.findUnique({
            where: { userId_listingId: { userId: auth.userId, listingId } },
            select: { id: true },
        });
        return json({ saved: !!saved });
    } catch {
        return json({ saved: false });
    }
};

// POST /api/listings/[id]/save — toggle save
export const POST: APIRoute = async ({ params, request, cookies }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) {
        return json({ error: 'Nicht eingeloggt' }, 401);
    }

    const listingId = params.id!;

    if (shouldUseListingFallback()) {
        // No DB — return mock toggle (client uses localStorage)
        return json({ saved: true, fallback: true });
    }

    try {
        const existing = await prisma.savedListing.findUnique({
            where: { userId_listingId: { userId: auth.userId, listingId } },
        });

        if (existing) {
            await prisma.savedListing.delete({
                where: { userId_listingId: { userId: auth.userId, listingId } },
            });
            return json({ saved: false });
        } else {
            await prisma.savedListing.create({
                data: { userId: auth.userId, listingId },
            });
            return json({ saved: true });
        }
    } catch (err) {
        if (shouldUseListingFallback(err)) {
            return json({ saved: true, fallback: true });
        }
        return json({ error: 'Fehler beim Speichern' }, 500);
    }
};
