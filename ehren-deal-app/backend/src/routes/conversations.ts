import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { sendToUser } from './websocket.js';
import { aiService } from '../services/ai-service.js';

const createConversationSchema = z.object({
  listingId: z.string().uuid(),
  message: z.string().min(1).max(5000).optional(),
});

const sendMessageSchema = z.object({
  body: z.string().min(1).max(5000),
  messageType: z.enum(['TEXT', 'IMAGE', 'SYSTEM', 'DEAL_ACTION']).default('TEXT'),
  metadata: z.record(z.unknown()).optional(),
});

const messagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function conversationRoutes(app: FastifyInstance) {
  // GET / - list own conversations
  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const profile = await prisma.profile.findUnique({ where: { userId: request.user!.id } });
    if (!profile) {
      return reply.status(404).send({ error: 'Profil nicht gefunden.' });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { buyerId: profile.id },
          { sellerId: profile.id },
        ],
      },
      orderBy: { lastMessageAt: 'desc' },
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
          select: { id: true, displayName: true, avatarUrl: true },
        },
        seller: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            body: true,
            senderId: true,
            messageType: true,
            readAt: true,
            createdAt: true,
          },
        },
      },
    });

    // Add unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: profile.id },
            readAt: null,
          },
        });
        const otherUser = conv.buyerId === profile.id ? conv.seller : conv.buyer;
        return {
          ...conv,
          otherUser,
          unreadCount,
          lastMessage: conv.messages[0] || null,
        };
      })
    );

    return reply.send(conversationsWithUnread);
  });

  // GET /:id/messages - messages for a conversation
  app.get('/:id/messages', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = messagesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validierungsfehler', details: parsed.error.flatten().fieldErrors });
    }

    const profile = await prisma.profile.findUnique({ where: { userId: request.user!.id } });
    if (!profile) {
      return reply.status(404).send({ error: 'Profil nicht gefunden.' });
    }

    const conversation = await prisma.conversation.findUnique({ where: { id } });
    if (!conversation) {
      return reply.status(404).send({ error: 'Konversation nicht gefunden.' });
    }

    if (conversation.buyerId !== profile.id && conversation.sellerId !== profile.id) {
      return reply.status(403).send({ error: 'Kein Zugriff auf diese Konversation.' });
    }

    const { page, limit } = parsed.data;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          sender: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
      }),
      prisma.message.count({ where: { conversationId: id } }),
    ]);

    // Mark unread messages as read
    await prisma.message.updateMany({
      where: {
        conversationId: id,
        senderId: { not: profile.id },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return reply.send({
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // POST / - create conversation or get existing
  app.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = createConversationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validierungsfehler', details: parsed.error.flatten().fieldErrors });
    }

    const profile = await prisma.profile.findUnique({ where: { userId: request.user!.id } });
    if (!profile) {
      return reply.status(404).send({ error: 'Profil nicht gefunden.' });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: parsed.data.listingId },
      include: { seller: { select: { id: true } } },
    });

    if (!listing || listing.status === 'DELETED') {
      return reply.status(404).send({ error: 'Inserat nicht gefunden.' });
    }

    if (listing.sellerId === profile.id) {
      return reply.status(400).send({ error: 'Du kannst dir nicht selbst schreiben.' });
    }

    // Check for existing conversation
    const existing = await prisma.conversation.findUnique({
      where: {
        listingId_buyerId: {
          listingId: listing.id,
          buyerId: profile.id,
        },
      },
      include: {
        listing: {
          select: { id: true, title: true, price: true, status: true },
        },
        buyer: { select: { id: true, displayName: true, avatarUrl: true } },
        seller: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    if (existing) {
      // Optionally send initial message
      if (parsed.data.message) {
        await prisma.message.create({
          data: {
            conversationId: existing.id,
            senderId: profile.id,
            body: parsed.data.message,
          },
        });
        await prisma.conversation.update({
          where: { id: existing.id },
          data: { lastMessageAt: new Date() },
        });
      }
      return reply.send(existing);
    }

    const conversation = await prisma.conversation.create({
      data: {
        listingId: listing.id,
        buyerId: profile.id,
        sellerId: listing.sellerId,
        lastMessageAt: parsed.data.message ? new Date() : null,
        messages: parsed.data.message
          ? {
              create: {
                senderId: profile.id,
                body: parsed.data.message,
              },
            }
          : undefined,
      },
      include: {
        listing: {
          select: { id: true, title: true, price: true, status: true },
        },
        buyer: { select: { id: true, displayName: true, avatarUrl: true } },
        seller: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    return reply.status(201).send(conversation);
  });

  // POST /:id/messages - send message
  app.post('/:id/messages', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = sendMessageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validierungsfehler', details: parsed.error.flatten().fieldErrors });
    }

    const profile = await prisma.profile.findUnique({ where: { userId: request.user!.id } });
    if (!profile) {
      return reply.status(404).send({ error: 'Profil nicht gefunden.' });
    }

    const conversation = await prisma.conversation.findUnique({ where: { id } });
    if (!conversation) {
      return reply.status(404).send({ error: 'Konversation nicht gefunden.' });
    }

    if (conversation.buyerId !== profile.id && conversation.sellerId !== profile.id) {
      return reply.status(403).send({ error: 'Kein Zugriff auf diese Konversation.' });
    }

    const { body, messageType, metadata } = parsed.data;

    const [message] = await Promise.all([
      prisma.message.create({
        data: {
          conversationId: id,
          senderId: profile.id,
          body,
          messageType,
          metadata: metadata ?? undefined as any,
        },
        include: {
          sender: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
      }),
      prisma.conversation.update({
        where: { id },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    // Echtzeit-Benachrichtigung via WebSocket
    const recipientId = conversation.buyerId === profile.id ? conversation.sellerId : conversation.buyerId;
    sendToUser(recipientId, 'new_message', {
      conversationId: id,
      message,
    });

    // Scam-Analyse im Hintergrund (non-blocking)
    if (body.length > 20) {
      aiService.analyzeRisk('message', message.id, body).catch(() => {});
    }

    // Persistente Notification
    prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'MESSAGE',
        title: 'Neue Nachricht',
        body: body.length > 100 ? body.substring(0, 100) + '...' : body,
        data: { conversationId: id, messageId: message.id },
      },
    }).catch(() => {});

    return reply.status(201).send(message);
  });
}
