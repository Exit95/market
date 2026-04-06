import { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { z } from 'zod';

export async function blockedUserRoutes(app: FastifyInstance) {
  // Get blocked users
  app.get('/', { preHandler: [authenticate] }, async (request) => {
    const userId = (request as any).userId;
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) return [];

    return prisma.blockedUser.findMany({
      where: { blockerId: profile.id },
      include: {
        blocked: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            trustLevel: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  // Block a user
  app.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = (request as any).userId;
    const schema = z.object({ blockedId: z.string().uuid() });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Ungueltige Anfrage' });

    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) return reply.status(404).send({ error: 'Profil nicht gefunden' });

    if (parsed.data.blockedId === profile.id) {
      return reply.status(400).send({ error: 'Du kannst dich nicht selbst blockieren' });
    }

    const existing = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: profile.id,
          blockedId: parsed.data.blockedId,
        },
      },
    });
    if (existing) return reply.status(409).send({ error: 'Nutzer bereits blockiert' });

    const blocked = await prisma.blockedUser.create({
      data: { blockerId: profile.id, blockedId: parsed.data.blockedId },
    });

    return reply.status(201).send(blocked);
  });

  // Unblock a user
  app.delete('/:blockedId', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = (request as any).userId;
    const { blockedId } = request.params as { blockedId: string };

    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) return reply.status(404).send({ error: 'Profil nicht gefunden' });

    await prisma.blockedUser.deleteMany({
      where: { blockerId: profile.id, blockedId },
    });

    return { success: true };
  });
}
