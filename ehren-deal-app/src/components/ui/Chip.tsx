import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { colors } from '@/theme/colors';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
}

export default function Chip({
  label,
  selected = false,
  onPress,
  icon,
}: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      style={({ pressed }) => [
        styles.container,
        selected ? styles.selected : styles.unselected,
        pressed && { opacity: 0.75 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.label, selected ? styles.labelSelected : styles.labelUnselected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  selected: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  unselected: {
    backgroundColor: 'transparent',
    borderColor: colors.neutral[300],
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  labelSelected: {
    color: colors.white,
  },
  labelUnselected: {
    color: colors.neutral[500],
  },
});
