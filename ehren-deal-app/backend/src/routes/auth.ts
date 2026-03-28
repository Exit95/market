import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { nanoid } from 'nanoid';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { sendPasswordResetMail } from '../utils/mail.js';
import { authenticate } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/rate-limit.js';

const registerSchema = z.object({
  email: z.string().email('Ungueltige E-Mail-Adresse'),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein'),
  displayName: z.string().min(2, 'Anzeigename muss mindestens 2 Zeichen lang sein').max(100),
});

const loginSchema = z.object({
  email: z.string().email('Ungueltige E-Mail-Adresse'),
  password: z.string().min(1, 'Passwort ist erforderlich'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh-Token ist erforderlich'),
});

export async function authRoutes(app: FastifyInstance) {
  // POST /register
  app.post('/register', { preHandler: [authRateLimit] }, async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validierungsfehler', details: parsed.error.flatten().fieldErrors });
    }

    const { email, password, displayName } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: 'Ein Konto mit dieser E-Mail-Adresse existiert bereits.' });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        profile: {
          create: {
            displayName,
          },
        },
      },
      include: { profile: true },
    });

    const accessToken = app.jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      { expiresIn: '15m' }
    );

    const refreshToken = app.jwt.sign(
      { id: user.id, email: user.email, role: user.role, tokenType: 'refresh' } as any,
      { expiresIn: '7d' }
    );

    return reply.status(201).send({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
      accessToken,
      refreshToken,
    });
  });

  // POST /login
  app.post('/login', { preHandler: [authRateLimit] }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validierungsfehler', details: parsed.error.flatten().fieldErrors });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      return reply.status(401).send({ error: 'Ungueltige Anmeldedaten.' });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Ungueltige Anmeldedaten.' });
    }

    if (user.profile?.isBlocked) {
      return reply.status(403).send({ error: 'Dein Konto wurde gesperrt.', reason: user.profile.blockedReason });
    }

    const accessToken = app.jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      { expiresIn: '15m' }
    );

    const refreshToken = app.jwt.sign(
      { id: user.id, email: user.email, role: user.role, tokenType: 'refresh' } as any,
      { expiresIn: '7d' }
    );

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
      accessToken,
      refreshToken,
    });
  });

  // POST /refresh
  app.post('/refresh', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validierungsfehler', details: parsed.error.flatten().fieldErrors });
    }

    const { refreshToken } = parsed.data;

    try {
      const decoded = app.jwt.verify<{ id: string; email: string; role: string; tokenType?: string }>(refreshToken);

      if (decoded.tokenType !== 'refresh') {
        return reply.status(401).send({ error: 'Ungueltiger Token-Typ.' });
      }

      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) {
        return reply.status(401).send({ error: 'Benutzer nicht gefunden.' });
      }

      const accessToken = app.jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        { expiresIn: '15m' }
      );

      return reply.send({ accessToken });
    } catch {
      return reply.status(401).send({ error: 'Ungueltiger oder abgelaufener Refresh-Token.' });
    }
  });

  // POST /logout
  app.post('/logout', async (_request, reply) => {
    return reply.send({ message: 'Erfolgreich abgemeldet.' });
  });

  // POST /forgot-password
  app.post('/forgot-password', async (request, reply) => {
    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Ungueltige E-Mail' });
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

    if (user) {
      const token = nanoid(48);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 Stunde

      // Alte Tokens loeschen
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

      await prisma.passwordResetToken.create({
        data: { userId: user.id, token, expiresAt },
      });

      await sendPasswordResetMail(user.email, token);
    }

    // Immer 200 zurueckgeben, um keine Rueckschluesse auf existierende Konten zu erlauben
    return reply.send({ message: 'Falls ein Konto mit dieser E-Mail existiert, wurde eine E-Mail gesendet.' });
  });

  // POST /reset-password
  app.post('/reset-password', { preHandler: [authRateLimit] }, async (request, reply) => {
    const schema = z.object({
      token: z.string().min(1),
      password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein'),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validierungsfehler', details: parsed.error.flatten().fieldErrors });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: parsed.data.token },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return reply.status(400).send({ error: 'Ungueltiger oder abgelaufener Link.' });
    }

    const passwordHash = await hashPassword(parsed.data.password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return reply.send({ message: 'Passwort erfolgreich geaendert.' });
  });

  // GET /me
  app.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            verifications: {
              select: { type: true, status: true, verifiedAt: true },
            },
          },
        },
      },
    });

    if (!user) {
      return reply.status(404).send({ error: 'Benutzer nicht gefunden.' });
    }

    return reply.send({
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      profile: user.profile,
    });
  });
}
