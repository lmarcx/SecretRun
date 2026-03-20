import { StyleSheet, Text, View } from 'react-native';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';
import { EventMetaRow } from './EventMetaRow';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import type { StatusBadgeTone } from './StatusBadge';
import { StatusBadge } from './StatusBadge';
import { SecretZoneBackdrop } from './SecretZoneBackdrop';

interface EventHeroCardProps {
  eyebrow: string;
  title: string;
  description: string;
  metaItems: Array<{ label: string; value: string; icon: 'reveal' | 'start' | 'zone' }>;
  statusBadge: { label: string; tone?: StatusBadgeTone };
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
  description,
  eyebrow,
  metaItems,
  primaryAction,
  secondaryAction,
  statusBadge,
  title,
}: EventHeroCardProps) {
  return (
    <View style={styles.card}>
      <SecretZoneBackdrop />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <StatusBadge label={statusBadge.label} tone={statusBadge.tone ?? 'neutral'} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text numberOfLines={2} style={styles.description}>
        {description}
      </Text>

      <EventMetaRow items={metaItems} />

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.textSecondary,
  },
  title: {
    ...typography.heroTitle,
    color: colors.textPrimary,
    maxWidth: '78%',
  },
  description: {
    ...typography.bodySm,
    color: colors.textSecondary,
    maxWidth: '72%',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  primaryButton: {
    flex: 1,
  },
  secondaryButton: {
    minWidth: 96,
  },
});
