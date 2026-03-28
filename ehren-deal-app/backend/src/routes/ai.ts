import { FastifyInstance } from 'fastify';
import { aiService } from '../services/ai-service.js';
import { authenticate } from '../middleware/auth.js';
import { aiRateLimit } from '../middleware/rate-limit.js';
import { z } from 'zod';

export async function aiRoutes(app: FastifyInstance) {
  // Get AI suggestions for listing draft
  app.post('/suggest-listing', { preHandler: [authenticate, aiRateLimit] }, async (request, reply) => {
    const schema = z.object({
      title: z.string().min(1),
      description: z.string().optional().default(''),
      categorySlug: z.string().optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validierungsfehler', details: parsed.error.flatten().fieldErrors });
    }
    const body = parsed.data;
    const suggestions = await aiService.suggestListingImprovements(body.title, body.description, body.categorySlug);
    if (!suggestions) {
      return reply.status(503).send({ error: 'KI-Service nicht verfügbar' });
    }
    return suggestions;
  });

  // Get price suggestion
  app.post('/suggest-price', { preHandler: [authenticate, aiRateLimit] }, async (request, reply) => {
    const schema = z.object({
      title: z.string().min(1),
      description: z.string().optional().default(''),
      condition: z.string(),
      categorySlug: z.string(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validierungsfehler', details: parsed.error.flatten().fieldErrors });
    }
    const body = parsed.data;
    const suggestion = await aiService.suggestPrice(body.title, body.description, body.condition, body.categorySlug);
    if (!suggestion) {
      return reply.status(503).send({ error: 'KI-Service nicht verfügbar' });
    }
    return suggestion;
  });

  // Check AI status
  app.get('/status', async () => {
    return { enabled: aiService.isEnabled() };
  });
}
