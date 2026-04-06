import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import Button from '../ui/Button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  message = 'Ein Fehler ist aufgetreten.',
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>!</Text>
      </View>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <View style={styles.buttonWrapper}>
          <Button variant="secondary" size="md" onPress={onRetry}>
            Erneut versuchen
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.error[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.error[500],
  },
  message: {
    fontSize: 15,
    color: colors.neutral[600],
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonWrapper: {
    marginTop: 24,
  },
});
