import { StyleSheet, Text, View } from 'react-native';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import type { StatusBadgeTone } from './StatusBadge';
import { StatusBadge } from './StatusBadge';

interface EventCardProps {
  title: string;
  description: string;
  meta: Array<{ label: string; value: string }>;
  badges?: Array<{ label: string; tone?: StatusBadgeTone }>;
  primaryAction?: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    tone?: 'primary' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
  };
}

export function EventCard({ badges = [], description, meta, primaryAction, secondaryAction, title }: EventCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.copyBlock}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        {badges.length > 0 ? (
          <View style={styles.badgeRow}>
            {badges.map((badge) => (
              <StatusBadge key={`${badge.label}-${badge.tone ?? 'neutral'}`} label={badge.label} tone={badge.tone ?? 'neutral'} />
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        {meta.map((item) => (
          <View key={item.label} style={styles.metaItem}>
            <Text style={styles.metaLabel}>{item.label}</Text>
            <Text style={styles.metaValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      {primaryAction || secondaryAction ? (
        <View style={styles.actions}>
          {primaryAction ? (
            primaryAction.tone === 'secondary' ? (
              <SecondaryButton
                compact
                label={primaryAction.label}
                onPress={primaryAction.onPress}
                disabled={primaryAction.disabled}
                style={styles.flexAction}
              />
            ) : (
              <PrimaryButton
                compact
                label={primaryAction.label}
                onPress={primaryAction.onPress}
                disabled={primaryAction.disabled}
                style={styles.flexAction}
              />
            )
          ) : null}
          {secondaryAction ? (
            <SecondaryButton
              compact
              label={secondaryAction.label}
              onPress={secondaryAction.onPress}
              disabled={secondaryAction.disabled}
              style={primaryAction ? styles.secondaryAction : styles.flexAction}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: borderWidth.regular,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    gap: spacing.sm,
  },
  copyBlock: {
    gap: spacing.xs,
  },
  title: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaItem: {
    flexGrow: 1,
    minWidth: 96,
    gap: spacing.xxs,
  },
  metaLabel: {
    ...typography.eyebrow,
    color: colors.textMuted,
  },
  metaValue: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  flexAction: {
    flex: 1,
  },
  secondaryAction: {
    minWidth: 96,
  },
});
