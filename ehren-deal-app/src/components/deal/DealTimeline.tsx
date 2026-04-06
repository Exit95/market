import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme';
import type { DealStatus, DealStatusHistory, DealType } from '@/types';
import { DEAL_STATUS_LABELS } from '@/utils/constants';

interface DealTimelineProps {
  statusHistory: DealStatusHistory[];
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

function getStages(dealType: DealType): DealStatus[] {
  return dealType === 'SHIPPING' ? SHIPPING_STAGES : PICKUP_STAGES;
}

function getStatusLabel(status: DealStatus): string {
  const map: Record<string, string> = {
    INQUIRY: 'Anfrage gesendet',
    NEGOTIATING: 'In Verhandlung',
    RESERVED: 'Reserviert',
    AGREED: 'Vereinbart',
    PAID: 'Bezahlt',
    SHIPPED: 'Versendet',
    HANDED_OVER: 'Zugestellt / Uebergeben',
    COMPLETED: 'Abgeschlossen',
    CANCELED: 'Storniert',
    CONFLICT: 'Streitfall',
  };
  return map[status] || DEAL_STATUS_LABELS[status] || status;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DealTimeline({
  statusHistory,
  currentStatus,
  dealType,
}: DealTimelineProps) {
  const stages = getStages(dealType);
  const currentIdx = stages.indexOf(currentStatus);

  const historyMap = new Map<string, DealStatusHistory>();
  for (const entry of statusHistory) {
    historyMap.set(entry.newStatus, entry);
  }

  return (
    <View style={styles.container}>
      {stages.map((stage, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isFuture = idx > currentIdx;
        const isLast = idx === stages.length - 1;
        const historyEntry = historyMap.get(stage);

        return (
          <View key={stage} style={styles.stepRow}>
            {/* Icon column */}
            <View style={styles.iconCol}>
              {isDone ? (
                <View style={styles.checkCircle}>
                  <Text style={styles.checkMark}>{'✓'}</Text>
                </View>
              ) : isCurrent ? (
                <View style={styles.currentCircle}>
                  <View style={styles.currentInner} />
                </View>
              ) : (
                <View style={styles.futureCircle} />
              )}
              {!isLast && (
                <View
                  style={[
                    styles.line,
                    isDone ? styles.lineDone : styles.lineFuture,
                  ]}
                />
              )}
            </View>

            {/* Content column */}
            <View style={styles.contentCol}>
              <Text
                style={[
                  styles.stepLabel,
                  isDone && styles.stepLabelDone,
                  isCurrent && styles.stepLabelCurrent,
                  isFuture && styles.stepLabelFuture,
                ]}
              >
                {getStatusLabel(stage)}
              </Text>
              {historyEntry && (
                <Text style={styles.stepDate}>
                  {formatDate(historyEntry.createdAt)}
                </Text>
              )}
              {historyEntry?.note && (
                <Text style={styles.stepNote}>{historyEntry.note}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 52,
  },
  iconCol: {
    width: 32,
    alignItems: 'center',
  },
  contentCol: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  currentCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  currentInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary[500],
  },
  futureCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    backgroundColor: colors.white,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 20,
  },
  lineDone: {
    backgroundColor: colors.success[500],
  },
  lineFuture: {
    backgroundColor: colors.neutral[200],
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  stepLabelDone: {
    color: colors.success[700],
  },
  stepLabelCurrent: {
    color: colors.primary[600],
    fontWeight: '600',
  },
  stepLabelFuture: {
    color: colors.neutral[400],
  },
  stepDate: {
    fontSize: 12,
    color: colors.neutral[400],
    marginTop: 2,
  },
  stepNote: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
    fontStyle: 'italic',
  },
});
