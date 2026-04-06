import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import { authRoutes } from './routes/auth.js';
import { listingRoutes } from './routes/listings.js';
import { categoryRoutes } from './routes/categories.js';
import { profileRoutes } from './routes/profiles.js';
import { favoriteRoutes } from './routes/favorites.js';
import { conversationRoutes } from './routes/conversations.js';
import { dealRoutes } from './routes/deals.js';
import { reviewRoutes } from './routes/reviews.js';
import { reportRoutes } from './routes/reports.js';
import { uploadRoutes } from './routes/uploads.js';
import { aiRoutes } from './routes/ai.js';
import { notificationRoutes } from './routes/notifications.js';
import { blockedUserRoutes } from './routes/blocked-users.js';
import { websocketRoutes } from './routes/websocket.js';
import { adminRoutes } from './routes/admin.js';
import { prisma } from './utils/prisma.js';

const app = Fastify({ logger: true });

async function start() {
  await app.register(cors, { origin: true });
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  await app.register(jwt, { secret: jwtSecret });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  await app.register(websocket);

  // Routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(listingRoutes, { prefix: '/api/listings' });
  await app.register(categoryRoutes, { prefix: '/api/categories' });
  await app.register(profileRoutes, { prefix: '/api/profiles' });
  await app.register(favoriteRoutes, { prefix: '/api/favorites' });
  await app.register(conversationRoutes, { prefix: '/api/conversations' });
  await app.register(dealRoutes, { prefix: '/api/deals' });
  await app.register(reviewRoutes, { prefix: '/api/reviews' });
  await app.register(reportRoutes, { prefix: '/api/reports' });
  await app.register(uploadRoutes, { prefix: '/api/uploads' });
  await app.register(aiRoutes, { prefix: '/api/ai' });
  await app.register(notificationRoutes, { prefix: '/api/notifications' });
  await app.register(blockedUserRoutes, { prefix: '/api/blocked-users' });
  await app.register(websocketRoutes);
  await app.register(adminRoutes, { prefix: '/api/admin' });

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  const port = parseInt(process.env.PORT || '4000');
  const host = process.env.HOST || '0.0.0.0';
  await app.listen({ port, host });
  console.log(`Ehren-Deal API running on ${host}:${port}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Graceful shutdown
const shutdown = async () => {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
