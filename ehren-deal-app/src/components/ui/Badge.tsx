import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

type TrustLevel = 'new' | 'confirmed' | 'verified' | 'trusted' | 'identified';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  trustLevel: TrustLevel;
  size?: BadgeSize;
}

const TRUST_CONFIG: Record<TrustLevel, { color: string; label: string }> = {
  new: { color: colors.trustNew, label: 'Neu' },
  confirmed: { color: colors.trustConfirmed, label: 'Bestätigt' },
  verified: { color: colors.trustVerified, label: 'Verifiziert' },
  trusted: { color: colors.trustTrusted, label: 'Vertraut' },
  identified: { color: colors.trustIdentified, label: 'Identifiziert' },
};

const DOT_SIZE: Record<BadgeSize, number> = { sm: 6, md: 8 };
const FONT_SIZE: Record<BadgeSize, number> = { sm: 11, md: 13 };
const PADDING_V: Record<BadgeSize, number> = { sm: 2, md: 4 };
const PADDING_H: Record<BadgeSize, number> = { sm: 6, md: 10 };

export default function Badge({ trustLevel, size = 'md' }: BadgeProps) {
  const config = TRUST_CONFIG[trustLevel];

  return (
    <View
      style={[
        styles.container,
        {
          paddingVertical: PADDING_V[size],
          paddingHorizontal: PADDING_H[size],
          borderColor: config.color,
        },
      ]}
    >
      <View
        style={[
          styles.dot,
          {
            width: DOT_SIZE[size],
            height: DOT_SIZE[size],
            borderRadius: DOT_SIZE[size] / 2,
            backgroundColor: config.color,
          },
        ]}
      />
      <Text
        style={[
          styles.label,
          { fontSize: FONT_SIZE[size], color: config.color },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    marginRight: 5,
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
