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
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: borderWidth.regular,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  compactButton: {
    minHeight: 44,
  },
  buttonPressed: {
    backgroundColor: colors.surface,
  },
  buttonDisabled: {
    opacity: 0.52,
  },
  label: {
    ...typography.button,
    color: colors.textPrimary,
  },
  labelDisabled: {
    color: colors.textMuted,
  },
});
