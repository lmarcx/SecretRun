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
    minHeight: 52,
    borderRadius: radius.xl,
    borderWidth: borderWidth.regular,
    borderColor: colors.accent,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    shadowColor: colors.accentGlow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 6,
  },
  compactButton: {
    minHeight: 46,
  },
  buttonPressed: {
    backgroundColor: colors.accentPressed,
    borderColor: colors.accentPressed,
    shadowOpacity: 0.6,
  },
  buttonDisabled: {
    backgroundColor: '#3D2B8A',
    borderColor: '#3D2B8A',
    shadowOpacity: 0,
    elevation: 0,
  },
  label: {
    ...typography.button,
    color: colors.white,
  },
  labelDisabled: {
    color: 'rgba(255, 255, 255, 0.52)',
  },
});
