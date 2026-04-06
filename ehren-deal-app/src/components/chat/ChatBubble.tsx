import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme';
import type { MessageType } from '@/types';

interface ChatBubbleProps {
  message: {
    body: string;
    senderId: string;
    createdAt: string;
    messageType: MessageType;
  };
  isOwn: boolean;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatBubble({ message, isOwn }: ChatBubbleProps) {
  if (message.messageType === 'SYSTEM') {
    return (
      <View style={styles.systemContainer}>
        <Text style={styles.systemText}>{message.body}</Text>
        <Text style={styles.systemTime}>{formatTime(message.createdAt)}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.row,
        isOwn ? styles.rowOwn : styles.rowOther,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isOwn ? styles.bubbleOwn : styles.bubbleOther,
        ]}
      >
        <Text
          style={[
            styles.body,
            isOwn ? styles.bodyOwn : styles.bodyOther,
          ]}
        >
          {message.body}
        </Text>
        <Text
          style={[
            styles.time,
            isOwn ? styles.timeOwn : styles.timeOther,
          ]}
        >
          {formatTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 12,
    marginVertical: 2,
  },
  rowOwn: {
    alignItems: 'flex-end',
  },
  rowOther: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
  },
  bubbleOwn: {
    backgroundColor: colors.primary[500],
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.neutral[100],
    borderBottomLeftRadius: 4,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
  },
  bodyOwn: {
    color: colors.white,
  },
  bodyOther: {
    color: colors.neutral[900],
  },
  time: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeOwn: {
    color: 'rgba(255,255,255,0.7)',
  },
  timeOther: {
    color: colors.neutral[400],
  },
  systemContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  systemText: {
    fontSize: 12,
    color: colors.neutral[400],
    textAlign: 'center',
    lineHeight: 17,
  },
  systemTime: {
    fontSize: 10,
    color: colors.neutral[300],
    marginTop: 2,
  },
});
