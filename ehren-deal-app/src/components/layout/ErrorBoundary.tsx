import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { colors, spacing } from '@/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View style={styles.container}>
          <AlertTriangle size={48} color={colors.error[500]} strokeWidth={1.5} />
          <Text style={styles.title}>Etwas ist schiefgelaufen</Text>
          <Text style={styles.message}>
            Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.
          </Text>
          <Pressable
            onPress={this.handleRetry}
            style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.buttonText}>Erneut versuchen</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl, backgroundColor: colors.background,
  },
  title: {
    fontSize: 20, fontWeight: '700', color: colors.neutral[900],
    marginTop: 16, marginBottom: 8,
  },
  message: {
    fontSize: 15, color: colors.neutral[500],
    textAlign: 'center', lineHeight: 22, marginBottom: 24,
  },
  button: {
    backgroundColor: colors.primary[500],
    paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10,
  },
  buttonText: {
    color: colors.white, fontSize: 15, fontWeight: '600',
  },
});
