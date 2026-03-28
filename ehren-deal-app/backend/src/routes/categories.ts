import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';

export async function categoryRoutes(app: FastifyInstance) {
  // GET / - list all categories
  app.get('/', async (_request, reply) => {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            listings: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
      where: {
        parentId: null,
      },
    });

    return reply.send(categories);
  });
}
