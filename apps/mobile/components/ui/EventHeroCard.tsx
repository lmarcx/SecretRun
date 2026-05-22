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
    <View style={styles.shadow}>
      <View style={styles.card}>
        <SecretZoneBackdrop />
        <View pointerEvents="none" style={styles.topHighlight} />

        <View style={styles.header}>
          <Text numberOfLines={1} style={styles.eyebrow}>
            {eyebrow}
          </Text>
          <StatusBadge label={statusBadge.label} tone={statusBadge.tone ?? 'neutral'} />
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text numberOfLines={1} style={styles.description}>
          {description}
        </Text>

        <EventMetaRow items={metaItems} withRail />

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
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: radius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 10,
  },
  card: {
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: borderWidth.regular,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 1,
    right: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderTopLeftRadius: radius.xl - 1,
    borderTopRightRadius: radius.xl - 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.textMuted,
    flexShrink: 1,
  },
  title: {
    ...typography.heroTitle,
    color: colors.textPrimary,
    maxWidth: '68%',
  },
  description: {
    ...typography.bodySm,
    color: colors.textSecondary,
    maxWidth: '62%',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  primaryButton: {
    flex: 1,
  },
  secondaryButton: {
    minWidth: 88,
  },
});
