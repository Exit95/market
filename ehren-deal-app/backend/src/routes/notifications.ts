import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { authenticate } from '../middleware/auth.js';

export async function notificationRoutes(app: FastifyInstance) {
  // Get all notifications for current user
  app.get('/', { preHandler: [authenticate] }, async (request) => {
    const userId = (request as any).userId;
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) return [];

    return prisma.notification.findMany({
      where: { userId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  });

  // Get unread count
  app.get('/unread-count', { preHandler: [authenticate] }, async (request) => {
    const userId = (request as any).userId;
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) return { count: 0 };

    const count = await prisma.notification.count({
      where: { userId: profile.id, readAt: null },
    });
    return { count };
  });

  // Mark notification as read
  app.put('/:id/read', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = (request as any).userId;
    const { id } = request.params as { id: string };
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) return reply.status(404).send({ error: 'Profil nicht gefunden' });

    const notification = await prisma.notification.findFirst({
      where: { id, userId: profile.id },
    });
    if (!notification) return reply.status(404).send({ error: 'Benachrichtigung nicht gefunden' });

    await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return { success: true };
  });

  // Mark all as read
  app.put('/read-all', { preHandler: [authenticate] }, async (request) => {
    const userId = (request as any).userId;
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) return { success: false };

    await prisma.notification.updateMany({
      where: { userId: profile.id, readAt: null },
      data: { readAt: new Date() },
    });

    return { success: true };
  });

  // Register push token
  app.post('/push-token', { preHandler: [authenticate] }, async (request, reply) => {
    const schema = z.object({
      token: z.string().min(1),
      platform: z.enum(['ios', 'android', 'web']),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Ungueltige Anfrage' });

    const userId = (request as any).userId;

    await prisma.pushToken.upsert({
      where: { token: parsed.data.token },
      update: { userId, platform: parsed.data.platform },
      create: { userId, token: parsed.data.token, platform: parsed.data.platform },
    });

    return { success: true };
  });
}
