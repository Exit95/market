import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme';
import type { DealStatus, DealType } from '@/types';

interface DealProgressBarProps {
  currentStatus: DealStatus;
  dealType: DealType;
}

const PICKUP_STAGES: DealStatus[] = [
  'INQUIRY',
  'NEGOTIATING',
  'AGREED',
  'HANDED_OVER',
  'COMPLETED',
];

const SHIPPING_STAGES: DealStatus[] = [
  'INQUIRY',
  'NEGOTIATING',
  'AGREED',
  'PAID',
  'SHIPPED',
  'COMPLETED',
];

const SHORT_LABELS: Record<string, string> = {
  INQUIRY: 'Anfrage',
  NEGOTIATING: 'Verhandlung',
  AGREED: 'Vereinbart',
  PAID: 'Bezahlt',
  SHIPPED: 'Versand',
  HANDED_OVER: 'Uebergeben',
  COMPLETED: 'Fertig',
};

export default function DealProgressBar({
  currentStatus,
  dealType,
}: DealProgressBarProps) {
  const stages = dealType === 'SHIPPING' ? SHIPPING_STAGES : PICKUP_STAGES;
  const currentIdx = stages.indexOf(currentStatus);

  return (
    <View style={styles.container}>
      <View style={styles.barRow}>
        {stages.map((stage, idx) => {
          const isDone = idx <= currentIdx;
          const isActive = idx === currentIdx;
          const isLast = idx === stages.length - 1;

          return (
            <React.Fragment key={stage}>
              {/* Dot */}
              <View
                style={[
                  styles.dot,
                  isDone ? styles.dotDone : styles.dotFuture,
                  isActive && styles.dotActive,
                ]}
              />
              {/* Segment line */}
              {!isLast && (
                <View
                  style={[
                    styles.segment,
                    idx < currentIdx ? styles.segmentDone : styles.segmentFuture,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Labels */}
      <View style={styles.labelRow}>
        {stages.map((stage, idx) => {
          const isActive = idx === currentIdx;
          return (
            <Text
              key={stage}
              style={[
                styles.label,
                isActive && styles.labelActive,
                idx <= currentIdx && styles.labelDone,
              ]}
              numberOfLines={1}
            >
              {SHORT_LABELS[stage] || stage}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotDone: {
    backgroundColor: colors.primary[500],
  },
  dotFuture: {
    backgroundColor: colors.neutral[300],
  },
  dotActive: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.primary[500],
    backgroundColor: colors.white,
  },
  segment: {
    flex: 1,
    height: 3,
  },
  segmentDone: {
    backgroundColor: colors.primary[500],
  },
  segmentFuture: {
    backgroundColor: colors.neutral[200],
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  label: {
    fontSize: 10,
    color: colors.neutral[400],
    textAlign: 'center',
    flex: 1,
  },
  labelActive: {
    color: colors.primary[600],
    fontWeight: '600',
  },
  labelDone: {
    color: colors.primary[500],
  },
});
