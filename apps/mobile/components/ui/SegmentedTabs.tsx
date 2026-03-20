import { Pressable, StyleSheet, Text, View } from 'react-native';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';

export interface SegmentedTabsItem {
  key: string;
  label: string;
  disabled?: boolean;
}

interface SegmentedTabsProps {
  items: SegmentedTabsItem[];
  value: string;
  onChange: (nextValue: string) => void;
  compact?: boolean;
}

export function SegmentedTabs({ compact = false, items, onChange, value }: SegmentedTabsProps) {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {items.map((item) => {
        const active = item.key === value;

        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active, disabled: item.disabled }}
            disabled={item.disabled}
            onPress={() => onChange(item.key)}
            style={({ pressed }) => [
              styles.tab,
              compact && styles.tabCompact,
              active && styles.tabActive,
              item.disabled && styles.tabDisabled,
              pressed && !item.disabled && !active && styles.tabPressed,
            ]}
          >
            <Text style={[styles.label, compact && styles.labelCompact, active && styles.labelActive, item.disabled && styles.labelDisabled]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: borderWidth.regular,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.xxs,
  },
  containerCompact: {
    gap: spacing.xxs,
  },
  tab: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  tabCompact: {
    minHeight: 38,
    paddingHorizontal: spacing.xs,
  },
  tabActive: {
    borderWidth: borderWidth.regular,
    borderColor: 'rgba(120, 86, 255, 0.24)',
    backgroundColor: colors.accentSoft,
  },
  tabDisabled: {
    opacity: 0.44,
  },
  tabPressed: {
    backgroundColor: colors.surface,
  },
  label: {
    ...typography.button,
    color: colors.textSecondary,
  },
  labelCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
  labelActive: {
    color: '#D4CCFF',
  },
  labelDisabled: {
    color: colors.textMuted,
  },
});
