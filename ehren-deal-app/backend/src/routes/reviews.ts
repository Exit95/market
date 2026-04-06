import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { trustService } from '../services/trust-service.js';

const createReviewSchema = z.object({
  dealId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(2000).optional(),
});

export async function reviewRoutes(app: FastifyInstance) {
  // GET /user/:userId - get reviews for a user
  app.get('/user/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };

    const now = new Date();

    const reviews = await prisma.review.findMany({
      where: {
        revieweeId: userId,
        isRemoved: false,
        OR: [
          { visibleAt: null },
          { visibleAt: { lte: now } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        deal: {
          select: {
            id: true,
            listing: {
              select: { id: true, title: true },
            },
          },
        },
      },
    });

    // Calculate stats
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      ratingDistribution[r.rating as keyof typeof ratingDistribution]++;
    });

    return reply.send({
      reviews,
      stats: {
        totalReviews,
        avgRating: Math.round(avgRating * 10) / 10,
        ratingDistribution,
      },
    });
  });

  // POST / - create review
  app.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = createReviewSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validierungsfehler', details: parsed.error.flatten().fieldErrors });
    }

    const profile = await prisma.profile.findUnique({ where: { userId: request.user!.id } });
    if (!profile) {
      return reply.status(404).send({ error: 'Profil nicht gefunden.' });
    }

    const { dealId, rating, text } = parsed.data;

    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        reviews: true,
      },
    });

    if (!deal) {
      return reply.status(404).send({ error: 'Deal nicht gefunden.' });
    }

    // Must be participant
    if (deal.buyerId !== profile.id && deal.sellerId !== profile.id) {
      return reply.status(403).send({ error: 'Du bist kein Teilnehmer dieses Deals.' });
    }

    // Deal must be completed
    if (deal.status !== 'COMPLETED') {
      return reply.status(400).send({ error: 'Bewertungen sind nur fuer abgeschlossene Deals moeglich.' });
    }

    // Check unique constraint
    const existingReview = await prisma.review.findUnique({
      where: {
        dealId_reviewerId: {
          dealId,
          reviewerId: profile.id,
        },
      },
    });

    if (existingReview) {
      return reply.status(409).send({ error: 'Du hast diesen Deal bereits bewertet.' });
    }

    // Determine reviewee (the other party)
    const revieweeId = deal.buyerId === profile.id ? deal.sellerId : deal.buyerId;

    // Determine visibility: if both parties have reviewed, make visible immediately
    // Otherwise, set visible 14 days after deal completion
    const otherReview = deal.reviews.find((r) => r.reviewerId === revieweeId);
    let visibleAt: Date;

    if (otherReview) {
      // Both have now reviewed - make both visible immediately
      visibleAt = new Date();
      // Also make the other review visible now if it wasn't already
      if (otherReview.visibleAt && otherReview.visibleAt > new Date()) {
        await prisma.review.update({
          where: { id: otherReview.id },
          data: { visibleAt: new Date() },
        });
      }
    } else {
      // Only one review so far - set visible 14 days after deal completion
      const completedAt = deal.completedAt || new Date();
      visibleAt = new Date(completedAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    }

    const review = await prisma.$transaction(async (tx) => {
      const newReview = await tx.review.create({
        data: {
          dealId,
          reviewerId: profile.id,
          revieweeId,
          rating,
          text: text || null,
          visibleAt,
        },
        include: {
          reviewer: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
      });

      // Recalculate average rating for the reviewee
      const allVisibleReviews = await tx.review.findMany({
        where: {
          revieweeId,
          isRemoved: false,
        },
        select: { rating: true },
      });

      const totalRating = allVisibleReviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = allVisibleReviews.length > 0
        ? Math.round((totalRating / allVisibleReviews.length) * 10) / 10
        : 0;

      await tx.profile.update({
        where: { id: revieweeId },
        data: { avgRating },
      });

      // Notify reviewee
      await tx.notification.create({
        data: {
          userId: revieweeId,
          type: 'REVIEW',
          title: 'Neue Bewertung',
          body: `${profile.displayName} hat dich mit ${rating} Sternen bewertet.`,
          data: { reviewId: newReview.id, dealId },
        },
      });

      // Trust-Level-Upgrade pruefen (non-blocking)
      trustService.recalculateTrustLevel(revieweeId).catch(() => {});

      return newReview;
    });

    return reply.status(201).send(review);
  });

  // GET /deal/:dealId - get reviews for a deal
  app.get('/deal/:dealId', { preHandler: [authenticate] }, async (request, reply) => {
    const { dealId } = request.params as { dealId: string };

    const profile = await prisma.profile.findUnique({ where: { userId: request.user!.id } });
    if (!profile) {
      return reply.status(404).send({ error: 'Profil nicht gefunden.' });
    }

    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) {
      return reply.status(404).send({ error: 'Deal nicht gefunden.' });
    }

    if (deal.buyerId !== profile.id && deal.sellerId !== profile.id) {
      return reply.status(403).send({ error: 'Kein Zugriff auf diesen Deal.' });
    }

    const now = new Date();

    const reviews = await prisma.review.findMany({
      where: {
        dealId,
        isRemoved: false,
      },
      include: {
        reviewer: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        reviewee: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    });

    // Filter: show own review always, show other's review only if visible
    const visibleReviews = reviews.map((review) => {
      if (review.reviewerId === profile.id) {
        return review;
      }
      if (review.visibleAt && review.visibleAt > now) {
        return {
          ...review,
          rating: null,
          text: null,
          hidden: true,
          visibleAt: review.visibleAt,
        };
      }
      return review;
    });

    const hasReviewed = reviews.some((r) => r.reviewerId === profile.id);

    return reply.send({
      reviews: visibleReviews,
      hasReviewed,
      canReview: deal.status === 'COMPLETED' && !hasReviewed,
    });
  });
}
