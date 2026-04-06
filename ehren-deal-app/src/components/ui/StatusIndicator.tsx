import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

import type { DealStatus } from '@/types';

interface StatusIndicatorProps {
  status: DealStatus;
}

const STATUS_CONFIG: Record<DealStatus, { color: string; label: string }> = {
  INQUIRY: { color: colors.warning[500], label: 'Anfrage' },
  NEGOTIATING: { color: colors.warning[500], label: 'In Verhandlung' },
  RESERVED: { color: colors.warning[600], label: 'Reserviert' },
  AGREED: { color: colors.warning[600], label: 'Vereinbart' },
  PAID: { color: colors.dealPaid, label: 'Bezahlt' },
  SHIPPED: { color: colors.dealShipped, label: 'Versendet' },
  HANDED_OVER: { color: colors.success[500], label: 'Uebergeben' },
  COMPLETED: { color: colors.dealCompleted, label: 'Abgeschlossen' },
  CANCELED: { color: colors.dealCanceled, label: 'Storniert' },
  CONFLICT: { color: colors.dealConflict, label: 'Streitfall' },
};

export default function StatusIndicator({ status }: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status];

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
});
