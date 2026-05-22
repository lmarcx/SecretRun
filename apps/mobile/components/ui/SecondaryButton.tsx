import type { PressableProps, StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text } from 'react-native';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';

interface SecondaryButtonProps extends PressableProps {
  label: string;
  compact?: boolean;
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
}

export function SecondaryButton({ compact = false, disabled, label, style, textStyle, ...props }: SecondaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compactButton,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
        style,
      ]}
      {...props}
    >
      <Text style={[styles.label, disabled && styles.labelDisabled, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.xl,
    borderWidth: borderWidth.regular,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  compactButton: {
    minHeight: 46,
  },
  buttonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  label: {
    ...typography.button,
    color: colors.textSecondary,
  },
  labelDisabled: {
    color: colors.textMuted,
  },
});
