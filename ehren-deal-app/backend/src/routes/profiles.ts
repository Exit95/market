import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { authenticate } from '../middleware/auth.js';

const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  bio: z.string().max(1000).optional(),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(10).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export async function profileRoutes(app: FastifyInstance) {
  // GET /me/stats - own stats
  app.get('/me/stats', { preHandler: [authenticate] }, async (request, reply) => {
    const profile = await prisma.profile.findUnique({ where: { userId: request.user!.id } });
    if (!profile) {
      return reply.status(404).send({ error: 'Profil nicht gefunden.' });
    }

    const [listingsCount, activeListingsCount, dealsAsBuyerCount, dealsAsSellerCount, reviewsReceivedCount] = await Promise.all([
      prisma.listing.count({ where: { sellerId: profile.id, status: { not: 'DELETED' } } }),
      prisma.listing.count({ where: { sellerId: profile.id, status: 'ACTIVE' } }),
      prisma.deal.count({ where: { buyerId: profile.id } }),
      prisma.deal.count({ where: { sellerId: profile.id } }),
      prisma.review.count({ where: { revieweeId: profile.id, isRemoved: false } }),
    ]);

    return reply.send({
      totalListings: listingsCount,
      activeListings: activeListingsCount,
      totalDealsAsBuyer: dealsAsBuyerCount,
      totalDealsAsSeller: dealsAsSellerCount,
      totalDeals: dealsAsBuyerCount + dealsAsSellerCount,
      reviewsReceived: reviewsReceivedCount,
      avgRating: profile.avgRating,
      trustLevel: profile.trustLevel,
      memberSince: profile.createdAt,
    });
  });

  // PUT /me - update own profile
  app.put('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = updateProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validierungsfehler', details: parsed.error.flatten().fieldErrors });
    }

    const profile = await prisma.profile.findUnique({ where: { userId: request.user!.id } });
    if (!profile) {
      return reply.status(404).send({ error: 'Profil nicht gefunden.' });
    }

    const updated = await prisma.profile.update({
      where: { id: profile.id },
      data: parsed.data,
    });

    return reply.send(updated);
  });

  // GET /:id - public profile
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const profile = await prisma.profile.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        city: true,
        trustLevel: true,
        avgRating: true,
        totalDeals: true,
        responseTimeMinutes: true,
        createdAt: true,
        isBlocked: true,
      },
    });

    if (!profile || profile.isBlocked) {
      return reply.status(404).send({ error: 'Profil nicht gefunden.' });
    }

    const [activeListings, reviewsReceived] = await Promise.all([
      prisma.listing.count({ where: { sellerId: id, status: 'ACTIVE' } }),
      prisma.review.count({ where: { revieweeId: id, isRemoved: false } }),
    ]);

    const { isBlocked, ...publicProfile } = profile;

    return reply.send({
      ...publicProfile,
      activeListings,
      reviewsReceived,
    });
  });
}
