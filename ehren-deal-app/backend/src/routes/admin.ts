import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { authenticate } from '../middleware/auth.js';

// Middleware: nur Moderatoren/Admins
async function requireModerator(request: any, reply: any) {
  await authenticate(request, reply);
  if (request.user?.role !== 'MODERATOR' && request.user?.role !== 'ADMIN') {
    return reply.status(403).send({ error: 'Keine Berechtigung' });
  }
}

export async function adminRoutes(app: FastifyInstance) {
  // GET /stats - Dashboard-Statistiken
  app.get('/stats', { preHandler: [requireModerator] }, async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pendingReports, flaggedListings, totalUsers, totalListings, totalDeals, aiChecksToday] =
      await Promise.all([
        prisma.report.count({ where: { status: 'PENDING' } }),
        prisma.listing.count({ where: { aiRiskScore: { gte: 0.7 }, status: 'ACTIVE' } }),
        prisma.user.count(),
        prisma.listing.count({ where: { status: { not: 'DELETED' } } }),
        prisma.deal.count(),
        prisma.aiCheck.count({ where: { createdAt: { gte: today } } }),
      ]);

    return { pendingReports, flaggedListings, totalUsers, totalListings, totalDeals, aiChecksToday };
  });

  // GET /reports - alle Reports
  app.get('/reports', { preHandler: [requireModerator] }, async (request) => {
    const { status } = request.query as { status?: string };

    return prisma.report.findMany({
      where: status ? { status: status as any } : {},
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 100,
      include: {
        reporter: {
          select: { displayName: true, avatarUrl: true },
        },
      },
    });
  });

  // PUT /reports/:id - Report bearbeiten
  app.put('/reports/:id', { preHandler: [requireModerator] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      status: z.enum(['REVIEWING', 'RESOLVED', 'DISMISSED']),
      resolutionNote: z.string().optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Ungueltige Anfrage' });

    const profile = await prisma.profile.findUnique({ where: { userId: request.user!.id } });

    return prisma.report.update({
      where: { id },
      data: {
        status: parsed.data.status,
        resolutionNote: parsed.data.resolutionNote,
        reviewedById: profile?.id,
        reviewedAt: new Date(),
      },
    });
  });

  // GET /flagged-listings - KI-markierte Inserate
  app.get('/flagged-listings', { preHandler: [requireModerator] }, async () => {
    return prisma.listing.findMany({
      where: { aiRiskScore: { gte: 0.5 }, status: { not: 'DELETED' } },
      orderBy: { aiRiskScore: 'desc' },
      take: 50,
      select: {
        id: true, title: true, price: true, status: true,
        aiRiskScore: true, aiQualityScore: true, aiSuggestions: true,
        createdAt: true,
        seller: { select: { displayName: true, trustLevel: true } },
      },
    });
  });

  // PUT /listings/:id/review - Listing genehmigen/deaktivieren
  app.put('/listings/:id/review', { preHandler: [requireModerator] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({ action: z.enum(['approve', 'deactivate']) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Ungueltige Anfrage' });

    if (parsed.data.action === 'deactivate') {
      await prisma.listing.update({
        where: { id },
        data: { status: 'DEACTIVATED' },
      });
    }

    // KI-Check als reviewed markieren
    await prisma.aiCheck.updateMany({
      where: { targetId: id, targetType: 'listing', reviewed: false },
      data: { reviewed: true },
    });

    return { success: true };
  });

  // GET /ai-checks - KI-Pruefungen
  app.get('/ai-checks', { preHandler: [requireModerator] }, async () => {
    return prisma.aiCheck.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  });
}
