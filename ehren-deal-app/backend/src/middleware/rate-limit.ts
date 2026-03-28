import type { FastifyRequest, FastifyReply } from 'fastify';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-Memory Rate Limiter (fuer Produktion: Redis verwenden)
const store = new Map<string, RateLimitEntry>();

// Cleanup alle 5 Minuten
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  keyGenerator?: (request: FastifyRequest) => string;
}

export function rateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = 60 * 1000, // 1 Minute
    max = 60,
    keyGenerator = (req) => {
      const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      return `rl:${ip}`;
    },
  } = options;

  return async function rateLimitHandler(request: FastifyRequest, reply: FastifyReply) {
    const key = keyGenerator(request);
    const now = Date.now();
    let entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    reply.header('X-RateLimit-Limit', max);
    reply.header('X-RateLimit-Remaining', Math.max(0, max - entry.count));
    reply.header('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > max) {
      return reply.status(429).send({
        error: 'Zu viele Anfragen. Bitte versuche es spaeter erneut.',
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
    }
  };
}

// Vordefinierte Limiter
export const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }); // 10 pro 15 Min
export const apiRateLimit = rateLimit({ windowMs: 60 * 1000, max: 100 }); // 100 pro Minute
export const uploadRateLimit = rateLimit({ windowMs: 60 * 1000, max: 20 }); // 20 pro Minute
export const aiRateLimit = rateLimit({ windowMs: 60 * 1000, max: 10 }); // 10 pro Minute
