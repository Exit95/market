/**
 * src/lib/auth.ts
 * Lucia v3 setup mit Prisma Adapter
 */
import { Lucia } from 'lucia';
import { PrismaAdapter } from '@lucia-auth/adapter-prisma';
import { PrismaClient } from '@prisma/client';
import type { Role } from '@prisma/client';

const prisma = new PrismaClient();

const adapter = new PrismaAdapter(prisma.session, prisma.user);

export const lucia = new Lucia(adapter, {
    sessionCookie: {
        attributes: {
            secure: import.meta.env.NODE_ENV === 'production',
            sameSite: 'lax',
        },
    },
    getUserAttributes(attrs) {
        return {
            email: attrs.email,
            firstName: attrs.firstName,
            lastName: attrs.lastName,
            role: attrs.role,
            emailVerified: attrs.emailVerified,
            kycStatus: attrs.kycStatus,
            trustScore: attrs.trustScore,
        };
    },
});

export { prisma };

declare module 'lucia' {
    interface Register {
        Lucia: typeof lucia;
        DatabaseUserAttributes: {
            email: string;
            firstName: string | null;
            lastName: string | null;
            role: Role;
            emailVerified: boolean;
            kycStatus: string;
            trustScore: number;
        };
    }
}
