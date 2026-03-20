import { StyleSheet, Text, View } from 'react-native';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import type { StatusBadgeTone } from './StatusBadge';
import { StatusBadge } from './StatusBadge';

interface EventHeroCardProps {
  eyebrow: string;
  title: string;
  description: string;
  detailItems: Array<{ label: string; value: string }>;
  badges?: Array<{ label: string; tone?: StatusBadgeTone }>;
  helperText?: string;
  primaryAction: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
  };
  secondaryAction?: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
  };
}

export function EventHeroCard({
  badges = [],
  description,
  detailItems,
  eyebrow,
  helperText,
  primaryAction,
  secondaryAction,
  title,
}: EventHeroCardProps) {
  return (
    <View style={styles.card}>
      <View pointerEvents="none" style={styles.glowPrimary} />
      <View pointerEvents="none" style={styles.glowSecondary} />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        {badges.length > 0 ? (
          <View style={styles.badgeRow}>
            {badges.map((badge) => (
              <StatusBadge key={`${badge.label}-${badge.tone ?? 'neutral'}`} label={badge.label} tone={badge.tone ?? 'neutral'} />
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.copyBlock}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <View style={styles.detailGrid}>
        {detailItems.map((item) => (
          <View key={item.label} style={styles.detailItem}>
            <Text style={styles.detailLabel}>{item.label}</Text>
            <Text style={styles.detailValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <PrimaryButton label={primaryAction.label} onPress={primaryAction.onPress} disabled={primaryAction.disabled} style={styles.primaryButton} />
        {secondaryAction ? (
          <SecondaryButton
            label={secondaryAction.label}
            onPress={secondaryAction.onPress}
            disabled={secondaryAction.disabled}
            style={styles.secondaryButton}
          />
        ) : null}
      </View>

      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: borderWidth.regular,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.lg,
    gap: spacing.md,
  },
  glowPrimary: {
    position: 'absolute',
    top: -34,
    right: -24,
    width: 160,
    height: 160,
    borderRadius: 160,
    backgroundColor: 'rgba(120, 86, 255, 0.18)',
  },
  glowSecondary: {
    position: 'absolute',
    bottom: -74,
    left: -28,
    width: 180,
    height: 180,
    borderRadius: 180,
    backgroundColor: 'rgba(138, 165, 255, 0.10)',
  },
  header: {
    gap: spacing.sm,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  copyBlock: {
    gap: spacing.xs,
  },
  title: {
    ...typography.heroTitle,
    color: colors.textPrimary,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    maxWidth: 420,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  detailItem: {
    flexGrow: 1,
    minWidth: 130,
    borderRadius: radius.md,
    borderWidth: borderWidth.regular,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xxs,
  },
  detailLabel: {
    ...typography.eyebrow,
    color: colors.textMuted,
  },
  detailValue: {
    ...typography.bodyLg,
    color: colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
  },
  secondaryButton: {
    minWidth: 108,
  },
  helperText: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
});
