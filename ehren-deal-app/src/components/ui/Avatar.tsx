import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

type AvatarSize = 'sm' | 'md' | 'lg';
type TrustLevel = 'new' | 'confirmed' | 'verified' | 'trusted' | 'identified';

interface AvatarProps {
  uri?: string | null;
  size?: AvatarSize;
  trustLevel?: TrustLevel;
  name?: string;
}

const SIZES: Record<AvatarSize, number> = { sm: 32, md: 48, lg: 72 };
const FONT_SIZES: Record<AvatarSize, number> = { sm: 12, md: 18, lg: 26 };
const RING_WIDTH: Record<AvatarSize, number> = { sm: 2, md: 2.5, lg: 3 };

const TRUST_RING_COLOR: Record<TrustLevel, string> = {
  new: colors.trustNew,
  confirmed: colors.trustConfirmed,
  verified: colors.trustVerified,
  trusted: colors.trustTrusted,
  identified: colors.trustIdentified,
};

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({
  uri,
  size = 'md',
  trustLevel,
  name,
}: AvatarProps) {
  const dimension = SIZES[size];
  const ringWidth = trustLevel ? RING_WIDTH[size] : 0;
  const outerDimension = dimension + ringWidth * 2 + 2;

  const inner = uri ? (
    <Image
      source={{ uri }}
      style={{
        width: dimension,
        height: dimension,
        borderRadius: dimension / 2,
      }}
    />
  ) : (
    <View
      style={[
        styles.fallback,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize: FONT_SIZES[size] }]}>
        {getInitials(name)}
      </Text>
    </View>
  );

  if (trustLevel) {
    return (
      <View
        style={[
          styles.ring,
          {
            width: outerDimension,
            height: outerDimension,
            borderRadius: outerDimension / 2,
            borderWidth: ringWidth,
            borderColor: TRUST_RING_COLOR[trustLevel],
          },
        ]}
      >
        {inner}
      </View>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.neutral[600],
    fontWeight: '600',
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
