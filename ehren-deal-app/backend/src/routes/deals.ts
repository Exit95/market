import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { authenticate } from '../middleware/auth.js';
import type { DealStatus } from '@prisma/client';

const createDealSchema = z.object({
  listingId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  dealType: z.enum(['PICKUP', 'SHIPPING', 'DIGITAL']).default('PICKUP'),
  agreedPrice: z.number().int().min(0).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum([
    'INQUIRY', 'NEGOTIATING', 'RESERVED', 'AGREED', 'PAID',
    'SHIPPED', 'HANDED_OVER', 'COMPLETED', 'CANCELED', 'CONFLICT',
  ]),
  note: z.string().max(1000).optional(),
  trackingNumber: z.string().max(100).optional(),
  agreedPrice: z.number().int().min(0).optional(),
});

const cancelDealSchema = z.object({
  reason: z.string().min(1).max(1000),
});

// Valid state transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  INQUIRY: ['NEGOTIATING', 'AGREED', 'CANCELED'],
  NEGOTIATING: ['RESERVED', 'AGREED', 'CANCELED'],
  RESERVED: ['AGREED', 'CANCELED'],
  AGREED: ['PAID', 'SHIPPED', 'HANDED_OVER', 'CANCELED'],
  PAID: ['SHIPPED', 'HANDED_OVER'],
  SHIPPED: ['COMPLETED', 'CONFLICT'],
  HANDED_OVER: ['COMPLETED', 'CONFLICT'],
  COMPLETED: ['CONFLICT'],
  CANCELED: [],
  CONFLICT: [],
};

export async function dealRoutes(app: FastifyInstance) {
  // GET / - list own deals
  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const profile = await prisma.profile.findUnique({ where: { userId: request.user!.id } });
    if (!profile) {
      return reply.status(404).send({ error: 'Profil nicht gefunden.' });
    }

    const deals = await prisma.deal.findMany({
      where: {
        OR: [
          { buyerId: profile.id },
          { sellerId: profile.id },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            price: true,
            status: true,
            images: {
              orderBy: { position: 'asc' },
              take: 1,
              select: { url: true },
            },
          },
        },
        buyer: {
          select: { id: true, displayName: true, avatarUrl: true, trustLevel: true },
        },
        seller: {
          select: { id: true, displayName: true, avatarUrl: true, trustLevel: true },
        },
      },
    });

    const dealsWithRole = deals.map((deal) => ({
      ...deal,
      myRole: deal.buyerId === profile.id ? 'buyer' : 'seller',
      otherParty: deal.buyerId === profile.id ? deal.seller : deal.buyer,
    }));

    return reply.send(dealsWithRole);
  });

  // GET /:id - deal detail with status history
  app.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const profile = await prisma.profile.findUnique({ where: { userId: request.user!.id } });
    if (!profile) {
      return reply.status(404).send({ error: 'Profil nicht gefunden.' });
    }

    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            price: true,
            status: true,
            images: {
              orderBy: { position: 'asc' },
              select: { url: true, position: true },
            },
          },
        },
        buyer: {
          select: { id: true, displayName: true, avatarUrl: true, trustLevel: true, city: true },
        },
        seller: {
          select: { id: true, displayName: true, avatarUrl: true, trustLevel: true, city: true },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: {
            changedBy: {
              select: { id: true, displayName: true },
            },
          },
        },
        reviews: {
          select: { id: true, reviewerId: true, rating: true, createdAt: true },
        },
      },
    });

    if (!deal) {
      return reply.status(404).send({ error: 'Deal nicht gefunden.' });
    }

    if (deal.buyerId !== profile.id && deal.sellerId !== profile.id) {
      return reply.status(403).send({ error: 'Kein Zugriff auf diesen Deal.' });
    }

    return reply.send({
      ...deal,
      myRole: deal.buyerId === profile.id ? 'buyer' : 'seller',
      otherParty: deal.buyerId === profile.id ? deal.seller : deal.buyer,
    });
  });

  // POST / - create deal
  app.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = createDealSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validierungsfehler', details: parsed.error.flatten().fieldErrors });
    }

    const profile = await prisma.profile.findUnique({ where: { userId: request.user!.id } });
    if (!profile) {
      return reply.status(404).send({ error: 'Profil nicht gefunden.' });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: parsed.data.listingId },
    });

    if (!listing || listing.status === 'DELETED') {
      return reply.status(404).send({ error: 'Inserat nicht gefunden.' });
    }

    if (listing.sellerId === profile.id) {
      return reply.status(400).send({ error: 'Du kannst keinen Deal fuer dein eigenes Inserat erstellen.' });
    }

    if (!['ACTIVE', 'RESERVED'].includes(listing.status)) {
      return reply.status(400).send({ error: 'Dieses Inserat ist nicht mehr verfuegbar.' });
    }

    // Check for existing active deal
    const existingDeal = await prisma.deal.findFirst({
      where: {
        listingId: listing.id,
        buyerId: profile.id,
        status: { notIn: ['CANCELED', 'COMPLETED'] },
      },
    });

    if (existingDeal) {
      return reply.status(409).send({ error: 'Du hast bereits einen aktiven Deal fuer dieses Inserat.', dealId: existingDeal.id });
    }

    const deal = await prisma.$transaction(async (tx) => {
      const newDeal = await tx.deal.create({
        data: {
          listingId: listing.id,
          buyerId: profile.id,
          sellerId: listing.sellerId,
          conversationId: parsed.data.conversationId,
          dealType: parsed.data.dealType,
          agreedPrice: parsed.data.agreedPrice,
          status: 'INQUIRY',
        },
        include: {
          listing: { select: { id: true, title: true, price: true } },
          buyer: { select: { id: true, displayName: true } },
          seller: { select: { id: true, displayName: true } },
        },
      });

      await tx.dealStatusHistory.create({
        data: {
          dealId: newDeal.id,
          oldStatus: null,
          newStatus: 'INQUIRY',
          changedById: profile.id,
          note: 'Deal erstellt',
        },
      });

      // Notify seller
      await tx.notification.create({
        data: {
          userId: listing.sellerId,
          type: 'DEAL_UPDATE',
          title: 'Neue Kaufanfrage',
          body: `${profile.displayName} moechte "${listing.title}" kaufen.`,
          data: { dealId: newDeal.id, listingId: listing.id },
        },
      });

      return newDeal;
    });

    return reply.status(201).send(deal);
  });

  // PUT /:id/status - update deal status
  app.put('/:id/status', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateStatusSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validierungsfehler', details: parsed.error.flatten().fieldErrors });
    }

    const profile = await prisma.profile.findUnique({ where: { userId: request.user!.id } });
    if (!profile) {
      return reply.status(404).send({ error: 'Profil nicht gefunden.' });
    }

    const deal = await prisma.deal.findUnique({ where: { id } });
    if (!deal) {
      return reply.status(404).send({ error: 'Deal nicht gefunden.' });
    }

    if (deal.buyerId !== profile.id && deal.sellerId !== profile.id) {
      return reply.status(403).send({ error: 'Kein Zugriff auf diesen Deal.' });
    }

    const { status: newStatus, note, trackingNumber, agreedPrice } = parsed.data;
    const currentStatus = deal.status;

    // Validate state transition
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      return reply.status(400).send({
        error: `Ungueltiger Statusuebergang von "${currentStatus}" nach "${newStatus}".`,
        allowedTransitions,
      });
    }

    // For COMPLETED transition from CONFLICT, only allow within 14 days
    if (currentStatus === 'COMPLETED' && newStatus === 'CONFLICT') {
      const daysSinceCompletion = deal.completedAt
        ? (Date.now() - deal.completedAt.getTime()) / (1000 * 60 * 60 * 24)
        : Infinity;
      if (daysSinceCompletion > 14) {
        return reply.status(400).send({ error: 'Konflikte koennen nur innerhalb von 14 Tagen nach Abschluss gemeldet werden.' });
      }
    }

    const updateData: any = {
      status: newStatus as DealStatus,
    };

    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }

    if (agreedPrice !== undefined) {
      updateData.agreedPrice = agreedPrice;
    }

    if (newStatus === 'COMPLETED') {
      updateData.completedAt = new Date();
      // Confirm for the party making the update
      if (deal.buyerId === profile.id) {
        updateData.buyerConfirmed = true;
      } else {
        updateData.sellerConfirmed = true;
      }
    }

    if (newStatus === 'CANCELED') {
      updateData.canceledAt = new Date();
      updateData.cancelReason = note || null;
    }

    const updatedDeal = await prisma.$transaction(async (tx) => {
      const updated = await tx.deal.update({
        where: { id },
        data: updateData,
        include: {
          listing: { select: { id: true, title: true } },
          buyer: { select: { id: true, displayName: true } },
          seller: { select: { id: true, displayName: true } },
        },
      });

      await tx.dealStatusHistory.create({
        data: {
          dealId: id,
          oldStatus: currentStatus,
          newStatus: newStatus as DealStatus,
          changedById: profile.id,
          note: note || null,
        },
      });

      // Update listing status if deal is agreed/completed
      if (newStatus === 'RESERVED') {
        await tx.listing.update({
          where: { id: deal.listingId },
          data: { status: 'RESERVED' },
        });
      } else if (newStatus === 'COMPLETED') {
        await tx.listing.update({
          where: { id: deal.listingId },
          data: { status: 'SOLD' },
        });
        // Update total deals count for both parties
        await tx.profile.update({
          where: { id: deal.buyerId },
          data: { totalDeals: { increment: 1 } },
        });
        await tx.profile.update({
          where: { id: deal.sellerId },
          data: { totalDeals: { increment: 1 } },
        });
      } else if (newStatus === 'CANCELED') {
        // Reactivate listing if no other active deals
        const otherActiveDeals = await tx.deal.count({
          where: {
            listingId: deal.listingId,
            id: { not: id },
            status: { notIn: ['CANCELED', 'COMPLETED'] },
          },
        });
        if (otherActiveDeals === 0) {
          await tx.listing.update({
            where: { id: deal.listingId },
            data: { status: 'ACTIVE' },
          });
        }
      }

      // Notify other party
      const recipientId = deal.buyerId === profile.id ? deal.sellerId : deal.buyerId;
      await tx.notification.create({
        data: {
          userId: recipientId,
          type: 'DEAL_UPDATE',
          title: 'Deal-Status aktualisiert',
          body: `Der Status fuer "${updated.listing.title}" wurde auf "${newStatus}" geaendert.`,
          data: { dealId: id, newStatus },
        },
      });

      return updated;
    });

    return reply.send(updatedDeal);
  });

  // PUT /:id/cancel - cancel deal
  app.put('/:id/cancel', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = cancelDealSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validierungsfehler', details: parsed.error.flatten().fieldErrors });
    }

    const profile = await prisma.profile.findUnique({ where: { userId: request.user!.id } });
    if (!profile) {
      return reply.status(404).send({ error: 'Profil nicht gefunden.' });
    }

    const deal = await prisma.deal.findUnique({ where: { id } });
    if (!deal) {
      return reply.status(404).send({ error: 'Deal nicht gefunden.' });
    }

    if (deal.buyerId !== profile.id && deal.sellerId !== profile.id) {
      return reply.status(403).send({ error: 'Kein Zugriff auf diesen Deal.' });
    }

    const allowedTransitions = VALID_TRANSITIONS[deal.status] || [];
    if (!allowedTransitions.includes('CANCELED')) {
      return reply.status(400).send({ error: `Deal im Status "${deal.status}" kann nicht storniert werden.` });
    }

    const updatedDeal = await prisma.$transaction(async (tx) => {
      const updated = await tx.deal.update({
        where: { id },
        data: {
          status: 'CANCELED',
          canceledAt: new Date(),
          cancelReason: parsed.data.reason,
        },
        include: {
          listing: { select: { id: true, title: true } },
        },
      });

      await tx.dealStatusHistory.create({
        data: {
          dealId: id,
          oldStatus: deal.status,
          newStatus: 'CANCELED',
          changedById: profile.id,
          note: parsed.data.reason,
        },
      });

      // Reactivate listing if no other active deals
      const otherActiveDeals = await tx.deal.count({
        where: {
          listingId: deal.listingId,
          id: { not: id },
          status: { notIn: ['CANCELED', 'COMPLETED'] },
        },
      });
      if (otherActiveDeals === 0) {
        await tx.listing.update({
          where: { id: deal.listingId },
          data: { status: 'ACTIVE' },
        });
      }

      // Notify other party
      const recipientId = deal.buyerId === profile.id ? deal.sellerId : deal.buyerId;
      await tx.notification.create({
        data: {
          userId: recipientId,
          type: 'DEAL_UPDATE',
          title: 'Deal storniert',
          body: `Der Deal fuer "${updated.listing.title}" wurde storniert: ${parsed.data.reason}`,
          data: { dealId: id },
        },
      });

      return updated;
    });

    return reply.send(updatedDeal);
  });
}
