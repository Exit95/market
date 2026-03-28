import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '@/theme';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { formatMemberSince } from '@/utils/format';
import type { TrustLevel } from '@/types';

interface ProfileData {
  displayName: string;
  avatarUrl: string | null;
  trustLevel: TrustLevel | string;
  avgRating: number;
  totalDeals: number;
  createdAt: string;
}

interface ProfileHeaderProps {
  profile: ProfileData;
  isOwn: boolean;
}

function mapTrustLevel(
  level: string
): 'new' | 'confirmed' | 'verified' | 'trusted' | 'identified' {
  const map: Record<string, 'new' | 'confirmed' | 'verified' | 'trusted' | 'identified'> = {
    NEW: 'new',
    CONFIRMED: 'confirmed',
    VERIFIED: 'verified',
    TRUSTED: 'trusted',
    IDENTIFIED: 'identified',
    new: 'new',
    confirmed: 'confirmed',
    verified: 'verified',
    trusted: 'trusted',
    identified: 'identified',
  };
  return map[level] ?? 'new';
}

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return (
    '\u2605'.repeat(full) +
    (half ? '\u00BD' : '') +
    '\u2606'.repeat(empty)
  );
}

export default function ProfileHeader({ profile, isOwn }: ProfileHeaderProps) {
  const trustKey = mapTrustLevel(profile.trustLevel);

  return (
    <View style={styles.container}>
      <Avatar
        uri={profile.avatarUrl}
        size="lg"
        trustLevel={trustKey}
        name={profile.displayName}
      />

      <Text style={styles.name}>{profile.displayName}</Text>

      <Badge trustLevel={trustKey} size="md" />

      <View style={styles.ratingRow}>
        <Text style={styles.stars}>{renderStars(profile.avgRating)}</Text>
        <Text style={styles.ratingText}>
          {profile.avgRating.toFixed(1)} ({profile.totalDeals}{' '}
          {profile.totalDeals === 1 ? 'Deal' : 'Deals'})
        </Text>
      </View>

      <Text style={styles.memberSince}>
        Mitglied seit {formatMemberSince(profile.createdAt)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral[900],
    marginTop: 12,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  stars: {
    fontSize: 16,
    color: colors.warning[500],
  },
  ratingText: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  memberSince: {
    fontSize: 13,
    color: colors.neutral[400],
    marginTop: 6,
  },
});
