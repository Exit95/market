import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  PressableProps,
} from 'react-native';
import { colors } from '@/theme/colors';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const HEIGHT: Record<ButtonSize, number> = { sm: 36, md: 48, lg: 56 };
const FONT_SIZE: Record<ButtonSize, number> = { sm: 13, md: 15, lg: 17 };
const PADDING_H: Record<ButtonSize, number> = { sm: 14, md: 20, lg: 28 };

export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onPress,
  children,
  fullWidth = false,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle[] = [
    styles.base,
    {
      height: HEIGHT[size],
      paddingHorizontal: PADDING_H[size],
      opacity: isDisabled ? 0.5 : 1,
    },
    fullWidth ? styles.fullWidth : undefined,
    variantStyles[variant].container,
    style,
  ].filter(Boolean) as ViewStyle[];

  const textColor = variantStyles[variant].text.color as string;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={({ pressed }) => [
        ...containerStyle,
        pressed && !isDisabled && { opacity: 0.75 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : typeof children === 'string' ? (
        <Text
          style={[
            styles.text,
            { fontSize: FONT_SIZE[size], color: textColor },
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const variantStyles: Record<
  ButtonVariant,
  { container: ViewStyle; text: TextStyle }
> = {
  primary: {
    container: {
      backgroundColor: colors.primary[500],
      borderWidth: 0,
    },
    text: { color: colors.white },
  },
  secondary: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.primary[500],
    },
    text: { color: colors.primary[500] },
  },
  tertiary: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
    text: { color: colors.primary[500] },
  },
  destructive: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.error[500],
    },
    text: { color: colors.error[500] },
  },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
