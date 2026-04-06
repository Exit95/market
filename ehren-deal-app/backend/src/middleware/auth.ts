import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';

interface JwtPayload {
  id: string;
  email: string;
  role: string;
  [key: string]: unknown;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const decoded = await request.jwtVerify<JwtPayload>();
    request.user = decoded;
  } catch (err) {
    return reply.status(401).send({ error: 'Nicht autorisiert. Bitte melde dich an.' });
  }
}

export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    const decoded = await request.jwtVerify<JwtPayload>();
    request.user = decoded;
  } catch {
    // Auth is optional, continue without user
  }
}
