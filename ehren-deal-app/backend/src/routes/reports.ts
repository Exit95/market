import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { authenticate } from '../middleware/auth.js';

const createReportSchema = z.object({
  targetType: z.enum(['USER', 'LISTING', 'REVIEW', 'MESSAGE']),
  targetId: z.string().uuid(),
  reason: z.enum(['SCAM', 'FAKE', 'OFFENSIVE', 'PROHIBITED', 'MISLEADING', 'DUPLICATE', 'HARASSMENT', 'SPAM', 'OTHER']),
  description: z.string().max(2000).optional(),
});

export async function reportRoutes(app: FastifyInstance) {
  // POST / - create report
  app.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = createReportSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validierungsfehler', details: parsed.error.flatten().fieldErrors });
    }

    const profile = await prisma.profile.findUnique({ where: { userId: request.user!.id } });
    if (!profile) {
      return reply.status(404).send({ error: 'Profil nicht gefunden.' });
    }

    const { targetType, targetId, reason, description } = parsed.data;

    // Validate target exists
    switch (targetType) {
      case 'USER': {
        const target = await prisma.profile.findUnique({ where: { id: targetId } });
        if (!target) {
          return reply.status(404).send({ error: 'Gemeldeter Benutzer nicht gefunden.' });
        }
        if (target.id === profile.id) {
          return reply.status(400).send({ error: 'Du kannst dich nicht selbst melden.' });
        }
        break;
      }
      case 'LISTING': {
        const target = await prisma.listing.findUnique({ where: { id: targetId } });
        if (!target) {
          return reply.status(404).send({ error: 'Gemeldetes Inserat nicht gefunden.' });
        }
        break;
      }
      case 'REVIEW': {
        const target = await prisma.review.findUnique({ where: { id: targetId } });
        if (!target) {
          return reply.status(404).send({ error: 'Gemeldete Bewertung nicht gefunden.' });
        }
        break;
      }
      case 'MESSAGE': {
        const target = await prisma.message.findUnique({ where: { id: targetId } });
        if (!target) {
          return reply.status(404).send({ error: 'Gemeldete Nachricht nicht gefunden.' });
        }
        break;
      }
    }

    // Check for duplicate report
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId: profile.id,
        targetType,
        targetId,
        status: { in: ['PENDING', 'REVIEWING'] },
      },
    });

    if (existingReport) {
      return reply.status(409).send({ error: 'Du hast dieses Ziel bereits gemeldet.' });
    }

    const report = await prisma.report.create({
      data: {
        reporterId: profile.id,
        targetType,
        targetId,
        reason,
        description: description || null,
      },
    });

    return reply.status(201).send({
      id: report.id,
      message: 'Meldung erfolgreich eingereicht. Wir pruefen deinen Bericht.',
    });
  });

  // GET / - list own reports
  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const profile = await prisma.profile.findUnique({ where: { userId: request.user!.id } });
    if (!profile) {
      return reply.status(404).send({ error: 'Profil nicht gefunden.' });
    }

    const reports = await prisma.report.findMany({
      where: { reporterId: profile.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        targetType: true,
        targetId: true,
        reason: true,
        description: true,
        status: true,
        resolutionNote: true,
        createdAt: true,
      },
    });

    return reply.send(reports);
  });
}
