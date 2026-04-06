import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { authenticate } from '../middleware/auth.js';

const addFavoriteSchema = z.object({
  listingId: z.string().uuid(),
});

export async function favoriteRoutes(app: FastifyInstance) {
  // GET / - list own favorites
  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const profile = await prisma.profile.findUnique({ where: { userId: request.user!.id } });
    if (!profile) {
      return reply.status(404).send({ error: 'Profil nicht gefunden.' });
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId: profile.id },
      orderBy: { createdAt: 'desc' },
      include: {
        listing: {
          include: {
            images: {
              orderBy: { position: 'asc' },
              take: 1,
            },
            seller: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
                city: true,
                trustLevel: true,
              },
            },
            category: {
              select: { id: true, name: true, slug: true, icon: true },
            },
          },
        },
      },
    });

    return reply.send(favorites);
  });

  // POST / - add favorite
  app.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = addFavoriteSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validierungsfehler', details: parsed.error.flatten().fieldErrors });
    }

    const profile = await prisma.profile.findUnique({ where: { userId: request.user!.id } });
    if (!profile) {
      return reply.status(404).send({ error: 'Profil nicht gefunden.' });
    }

    const listing = await prisma.listing.findUnique({ where: { id: parsed.data.listingId } });
    if (!listing || listing.status === 'DELETED') {
      return reply.status(404).send({ error: 'Inserat nicht gefunden.' });
    }

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_listingId: {
          userId: profile.id,
          listingId: parsed.data.listingId,
        },
      },
    });

    if (existing) {
      return reply.send(existing);
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId: profile.id,
        listingId: parsed.data.listingId,
      },
    });

    return reply.status(201).send(favorite);
  });

  // DELETE /:listingId - remove favorite
  app.delete('/:listingId', { preHandler: [authenticate] }, async (request, reply) => {
    const { listingId } = request.params as { listingId: string };

    const profile = await prisma.profile.findUnique({ where: { userId: request.user!.id } });
    if (!profile) {
      return reply.status(404).send({ error: 'Profil nicht gefunden.' });
    }

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_listingId: {
          userId: profile.id,
          listingId,
        },
      },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Favorit nicht gefunden.' });
    }

    await prisma.favorite.delete({
      where: { id: existing.id },
    });

    return reply.send({ message: 'Favorit entfernt.' });
  });
}
