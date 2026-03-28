import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { aiService } from '../services/ai-service.js';

const createListingSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  price: z.number().int().min(0),
  priceType: z.enum(['FIXED', 'NEGOTIABLE', 'FREE']).default('FIXED'),
  condition: z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'ACCEPTABLE', 'DEFECTIVE']),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(10).optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  shippingAvailable: z.boolean().default(false),
  pickupAvailable: z.boolean().default(true),
  status: z.enum(['DRAFT', 'ACTIVE']).default('ACTIVE'),
  imageUrls: z.array(z.string().url()).optional(),
});

const updateListingSchema = z.object({
  categoryId: z.string().uuid().optional(),
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).optional(),
  price: z.number().int().min(0).optional(),
  priceType: z.enum(['FIXED', 'NEGOTIABLE', 'FREE']).optional(),
  condition: z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'ACCEPTABLE', 'DEFECTIVE']).optional(),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(10).optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  shippingAvailable: z.boolean().optional(),
  pickupAvailable: z.boolean().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'RESERVED', 'SOLD', 'DEACTIVATED']).optional(),
  imageUrls: z.array(z.string().url()).optional(),
});

const listQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  condition: z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'ACCEPTABLE', 'DEFECTIVE']).optional(),
  shippingAvailable: z.coerce.boolean().optional(),
  pickupAvailable: z.coerce.boolean().optional(),
  verifiedSeller: z.coerce.boolean().optional(),
  sortBy: z.enum(['newest', 'price_asc', 'price_desc', 'popular']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

export async function listingRoutes(app: FastifyInstance) {
  // GET / - list listings with filters
  app.get('/', { preHandler: [optionalAuth] }, async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validierungsfehler', details: parsed.error.flatten().fieldErrors });
    }

    const {
      search, categoryId, minPrice, maxPrice, condition,
      shippingAvailable, pickupAvailable, verifiedSeller,
      sortBy, page, limit,
    } = parsed.data;

    const where: any = {
      status: 'ACTIVE',
    };

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (condition) {
      where.condition = condition;
    }

    if (shippingAvailable !== undefined) {
      where.shippingAvailable = shippingAvailable;
    }

    if (pickupAvailable !== undefined) {
      where.pickupAvailable = pickupAvailable;
    }

    if (verifiedSeller) {
      where.seller = {
        trustLevel: { in: ['VERIFIED', 'TRUSTED', 'IDENTIFIED'] },
      };
    }

    let orderBy: any;
    switch (sortBy) {
      case 'price_asc':
        orderBy = { price: 'asc' as const };
        break;
      case 'price_desc':
        orderBy = { price: 'desc' as const };
        break;
      case 'popular':
        orderBy = { viewCount: 'desc' as const };
        break;
      default:
        orderBy = { createdAt: 'desc' as const };
    }

    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy,
        skip,
        take: limit,
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
              avgRating: true,
              totalDeals: true,
            },
          },
          category: {
            select: { id: true, name: true, slug: true, icon: true },
          },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    return reply.send({
      listings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // GET /:id - single listing
  app.get('/:id', { preHandler: [optionalAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: 'asc' } },
        seller: {
          select: {
            id: true,
            userId: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
            city: true,
            postalCode: true,
            trustLevel: true,
            avgRating: true,
            totalDeals: true,
            responseTimeMinutes: true,
            createdAt: true,
          },
        },
        category: {
          select: { id: true, name: true, slug: true, icon: true },
        },
      },
    });

    if (!listing) {
      return reply.status(404).send({ error: 'Inserat nicht gefunden.' });
    }

    // Only show non-active listings to the owner
    if (listing.status !== 'ACTIVE' && listing.seller.userId !== request.user?.id) {
      // Allow showing RESERVED/SOLD to anyone, but not DELETED/DEACTIVATED/DRAFT
      if (['DELETED', 'DEACTIVATED', 'DRAFT'].includes(listing.status)) {
        return reply.status(404).send({ error: 'Inserat nicht gefunden.' });
      }
    }

    // Increment view count (fire-and-forget)
    prisma.listing.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});

    // Check if favorited by current user
    let isFavorited = false;
    if (request.user) {
      const profile = await prisma.profile.findUnique({ where: { userId: request.user.id } });
      if (profile) {
        const fav = await prisma.favorite.findUnique({
          where: { userId_listingId: { userId: profile.id, listingId: id } },
        });
        isFavorited = !!fav;
      }
    }

    return reply.send({ ...listing, isFavorited });
  });

  // POST / - create listing
  app.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = createListingSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validierungsfehler', details: parsed.error.flatten().fieldErrors });
    }

    const profile = await prisma.profile.findUnique({ where: { userId: request.user!.id } });
    if (!profile) {
      return reply.status(404).send({ error: 'Profil nicht gefunden.' });
    }

    const { imageUrls, ...listingData } = parsed.data;

    const category = await prisma.category.findUnique({ where: { id: listingData.categoryId } });
    if (!category) {
      return reply.status(400).send({ error: 'Ungueltige Kategorie.' });
    }

    const listing = await prisma.listing.create({
      data: {
        ...listingData,
        sellerId: profile.id,
        images: imageUrls
          ? {
              create: imageUrls.map((url, index) => ({
                url,
                position: index,
              })),
            }
          : undefined,
      },
      include: {
        images: { orderBy: { position: 'asc' } },
        seller: {
          select: { id: true, displayName: true, avatarUrl: true, city: true, trustLevel: true },
        },
        category: {
          select: { id: true, name: true, slug: true, icon: true },
        },
      },
    });

    // KI-Qualitaetspruefung im Hintergrund (non-blocking)
    if (listing.status === 'ACTIVE') {
      aiService.checkListingQuality(listing.id).catch(() => {});
    }

    return reply.status(201).send(listing);
  });

  // PUT /:id - update listing
  app.put('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const parsed = updateListingSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validierungsfehler', details: parsed.error.flatten().fieldErrors });
    }

    const profile = await prisma.profile.findUnique({ where: { userId: request.user!.id } });
    if (!profile) {
      return reply.status(404).send({ error: 'Profil nicht gefunden.' });
    }

    const existing = await prisma.listing.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Inserat nicht gefunden.' });
    }

    if (existing.sellerId !== profile.id) {
      return reply.status(403).send({ error: 'Du kannst nur deine eigenen Inserate bearbeiten.' });
    }

    if (existing.status === 'DELETED') {
      return reply.status(400).send({ error: 'Geloeschte Inserate koennen nicht bearbeitet werden.' });
    }

    const { imageUrls, ...updateData } = parsed.data;

    const listing = await prisma.$transaction(async (tx) => {
      if (imageUrls) {
        await tx.listingImage.deleteMany({ where: { listingId: id } });
        await tx.listingImage.createMany({
          data: imageUrls.map((url, index) => ({
            listingId: id,
            url,
            position: index,
          })),
        });
      }

      return tx.listing.update({
        where: { id },
        data: updateData,
        include: {
          images: { orderBy: { position: 'asc' } },
          seller: {
            select: { id: true, displayName: true, avatarUrl: true, city: true, trustLevel: true },
          },
          category: {
            select: { id: true, name: true, slug: true, icon: true },
          },
        },
      });
    });

    return reply.send(listing);
  });

  // DELETE /:id - soft-delete listing
  app.delete('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const profile = await prisma.profile.findUnique({ where: { userId: request.user!.id } });
    if (!profile) {
      return reply.status(404).send({ error: 'Profil nicht gefunden.' });
    }

    const existing = await prisma.listing.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Inserat nicht gefunden.' });
    }

    if (existing.sellerId !== profile.id && request.user!.role === 'USER') {
      return reply.status(403).send({ error: 'Du kannst nur deine eigenen Inserate loeschen.' });
    }

    await prisma.listing.update({
      where: { id },
      data: { status: 'DELETED' },
    });

    return reply.send({ message: 'Inserat geloescht.' });
  });
}
