import { StyleSheet, Text, View } from 'react-native';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';
import { EventMetaRow } from './EventMetaRow';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import type { StatusBadgeTone } from './StatusBadge';
import { StatusBadge } from './StatusBadge';
import { StatusStrip } from './StatusStrip';

interface EventCardProps {
  eyebrow?: string;
  title: string;
  description: string;
  meta: Array<{ label: string; value: string; icon: 'reveal' | 'start' | 'zone' }>;
  statusBadge?: { label: string; tone?: StatusBadgeTone };
  statusItems?: Array<{ label: string; tone?: StatusBadgeTone }>;
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

export function EventCard({
  description,
  eyebrow,
  meta,
  primaryAction,
  secondaryAction,
  statusBadge,
  statusItems = [],
  title,
}: EventCardProps) {
  return (
    <View style={styles.card}>
      <View pointerEvents="none" style={styles.topHighlight} />

      {eyebrow ? (
        <Text numberOfLines={1} style={styles.eyebrow}>
          {eyebrow}
        </Text>
      ) : null}

      <View style={styles.header}>
        <Text numberOfLines={2} style={styles.title}>
          {title}
        </Text>
        {statusBadge ? <StatusBadge label={statusBadge.label} tone={statusBadge.tone ?? 'neutral'} /> : null}
      </View>

      <Text numberOfLines={2} style={styles.description}>
        {description}
      </Text>

      {statusItems.length > 0 ? <StatusStrip compact muted items={statusItems} /> : null}

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
    borderRadius: radius.lg,
    borderWidth: borderWidth.regular,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 16,
    elevation: 4,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 1,
    right: 1,
    height: 1,
    backgroundColor: colors.glassHighlight,
    borderTopLeftRadius: radius.lg - 1,
    borderTopRightRadius: radius.lg - 1,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.textMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    minHeight: 34,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.xxs,
  },
  flexAction: {
    flex: 1,
  },
  secondaryAction: {
    minWidth: 96,
  },
});
