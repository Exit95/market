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
