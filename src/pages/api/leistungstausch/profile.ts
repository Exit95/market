import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/auth';
import { requireAuth, isAuthContext } from '../../../lib/auth-middleware';
import { ServiceProfileUpdateSchema } from '../../../lib/service-validation';
import { filterServiceContent } from '../../../lib/service-content-filter';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export const GET: APIRoute = async ({ request, cookies, url }) => {
  // Can view any user's profile by ?userId=
  const userId = url.searchParams.get('userId');

  if (userId) {
    const profile = await prisma.serviceProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true, avatarUrl: true, city: true,
            emailVerified: true, phoneVerified: true, idVerified: true, createdAt: true,
          },
        },
      },
    });
    if (!profile) return json({ profile: null });
    return json({ profile });
  }

  // Get own profile
  const auth = await requireAuth(request, cookies);
  if (!isAuthContext(auth)) return auth;

  const profile = await prisma.serviceProfile.findUnique({
    where: { userId: auth.userId },
  });

  return json({ profile });
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const auth = await requireAuth(request, cookies);
  if (!isAuthContext(auth)) return auth;

  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Ungültiger Body' }, 400); }

  const parsed = ServiceProfileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? 'Validierungsfehler' }, 400);
  }

  const data = parsed.data;

  // Content filter on bio
  if (data.bio) {
    const result = filterServiceContent(data.bio);
    if (!result.passed) {
      return json({ error: result.message, rule: result.rule }, 422);
    }
  }

  try {
    const profile = await prisma.serviceProfile.upsert({
      where: { userId: auth.userId },
      update: {
        bio: data.bio,
        skills: data.skills ? JSON.stringify(data.skills) : undefined,
        availability: data.availability ? JSON.stringify(data.availability) : undefined,
        responseTime: data.responseTime,
      },
      create: {
        userId: auth.userId,
        bio: data.bio,
        skills: data.skills ? JSON.stringify(data.skills) : null,
        availability: data.availability ? JSON.stringify(data.availability) : null,
        responseTime: data.responseTime,
      },
    });

    return json({ profile });
  } catch (err) {
    console.error('[API] PUT /api/leistungstausch/profile error:', err);
    return json({ error: 'Interner Serverfehler' }, 500);
  }
};
