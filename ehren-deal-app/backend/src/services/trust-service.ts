import { prisma } from '../utils/prisma.js';

/**
 * Trust-Level Upgrade-Logik
 *
 * NEW -> CONFIRMED: E-Mail verifiziert
 * CONFIRMED -> VERIFIED: 3+ abgeschlossene Deals, 4.0+ Durchschnittsbewertung
 * VERIFIED -> TRUSTED: 10+ Deals, 4.5+ Rating, 6+ Monate Mitglied
 * TRUSTED -> IDENTIFIED: Manuelle ID-Verifizierung (Admin)
 */

type TrustLevel = 'NEW' | 'CONFIRMED' | 'VERIFIED' | 'TRUSTED' | 'IDENTIFIED';

export const trustService = {
  async recalculateTrustLevel(profileId: string): Promise<TrustLevel> {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        verifications: true,
        user: { select: { createdAt: true } },
      },
    });

    if (!profile) return 'NEW';

    const emailVerified = profile.verifications.some(
      (v) => v.type === 'EMAIL' && v.status === 'VERIFIED'
    );
    const idVerified = profile.verifications.some(
      (v) => v.type === 'IDENTITY' && v.status === 'VERIFIED'
    );
    const monthsMember = profile.user
      ? Math.floor((Date.now() - profile.user.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30))
      : 0;

    let newLevel: TrustLevel = 'NEW';

    if (idVerified) {
      newLevel = 'IDENTIFIED';
    } else if (
      profile.totalDeals >= 10 &&
      profile.avgRating >= 4.5 &&
      monthsMember >= 6
    ) {
      newLevel = 'TRUSTED';
    } else if (
      profile.totalDeals >= 3 &&
      profile.avgRating >= 4.0
    ) {
      newLevel = 'VERIFIED';
    } else if (emailVerified) {
      newLevel = 'CONFIRMED';
    }

    // Nur upgraden, nicht downgraden
    const levelOrder: TrustLevel[] = ['NEW', 'CONFIRMED', 'VERIFIED', 'TRUSTED', 'IDENTIFIED'];
    const currentIdx = levelOrder.indexOf(profile.trustLevel as TrustLevel);
    const newIdx = levelOrder.indexOf(newLevel);

    if (newIdx > currentIdx) {
      await prisma.profile.update({
        where: { id: profileId },
        data: { trustLevel: newLevel },
      });

      // Benachrichtigung bei Upgrade
      if (newLevel !== profile.trustLevel) {
        const levelLabels: Record<string, string> = {
          CONFIRMED: 'Bestaetigt',
          VERIFIED: 'Verifiziert',
          TRUSTED: 'Top-Verkaeufer',
          IDENTIFIED: 'ID geprueft',
        };

        await prisma.notification.create({
          data: {
            userId: profileId,
            type: 'SYSTEM',
            title: 'Trust-Level Upgrade!',
            body: `Glueckwunsch! Dein Trust-Level wurde auf "${levelLabels[newLevel] ?? newLevel}" angehoben.`,
          },
        }).catch(() => {});
      }

      return newLevel;
    }

    return profile.trustLevel as TrustLevel;
  },
};
