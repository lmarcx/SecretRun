import type { PressableProps, StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text } from 'react-native';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';

interface PrimaryButtonProps extends PressableProps {
  label: string;
  compact?: boolean;
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({ compact = false, disabled, label, style, textStyle, ...props }: PrimaryButtonProps) {
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
    borderColor: colors.accent,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  compactButton: {
    minHeight: 44,
  },
  buttonPressed: {
    backgroundColor: colors.accentPressed,
    borderColor: colors.accentPressed,
  },
  buttonDisabled: {
    backgroundColor: '#43398A',
    borderColor: '#43398A',
  },
  label: {
    ...typography.button,
    color: colors.white,
  },
  labelDisabled: {
    color: 'rgba(255, 255, 255, 0.68)',
  },
});
