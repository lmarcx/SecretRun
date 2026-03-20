import { StyleSheet, Text, View } from 'react-native';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';
import { EventMetaRow } from './EventMetaRow';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import type { StatusBadgeTone } from './StatusBadge';
import { StatusBadge } from './StatusBadge';

interface EventCardProps {
  title: string;
  description: string;
  meta: Array<{ label: string; value: string; icon: 'reveal' | 'start' | 'zone' }>;
  statusBadge?: { label: string; tone?: StatusBadgeTone };
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

export function EventCard({ description, meta, primaryAction, secondaryAction, statusBadge, title }: EventCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {statusBadge ? <StatusBadge label={statusBadge.label} tone={statusBadge.tone ?? 'neutral'} /> : null}
      </View>

      <Text numberOfLines={1} style={styles.description}>
        {description}
      </Text>

      <EventMetaRow dense items={meta} />

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.cardTitle,
    color: colors.textPrimary,
    flex: 1,
  },
  description: {
    ...typography.bodySm,
    color: colors.textMuted,
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
