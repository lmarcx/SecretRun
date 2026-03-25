import { Pressable, StyleSheet, Text, View } from 'react-native';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';
import { ActionBar } from './ActionBar';
import { LeaderboardAvatar } from './LeaderboardAvatar';
import { SectionCard } from './SectionCard';
import { StatusBadge, type StatusBadgeTone } from './StatusBadge';

interface TeamOverviewCardProps {
  title: string;
  subtitle?: string | undefined;
  metaItems: Array<{ label: string; value: string }>;
  badgeLabel?: string | undefined;
  badgeTone?: StatusBadgeTone;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
  highlighted?: boolean | undefined;
}

export function TeamOverviewCard({
  actionLabel,
  badgeLabel,
  badgeTone = 'neutral',
  highlighted = false,
  metaItems,
  onAction,
  subtitle,
  title,
}: TeamOverviewCardProps) {
  const content = (
    <SectionCard
      accessory={badgeLabel ? <StatusBadge compact label={badgeLabel} tone={badgeTone} /> : undefined}
      tone={highlighted ? 'accent' : 'default'}
    >
      <View style={styles.identity}>
        <LeaderboardAvatar label={title} variant="team" />
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.metaRow}>
        {metaItems.map((item) => (
          <View key={`${item.label}-${item.value}`} style={styles.metaItem}>
            <Text style={styles.metaLabel}>{item.label}</Text>
            <Text numberOfLines={1} style={styles.metaValue}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>

      {actionLabel && onAction ? (
        <ActionBar
          primary={
            <View style={[styles.actionShell, highlighted && styles.actionShellHighlighted]}>
              <Text style={styles.actionLabel}>{actionLabel}</Text>
            </View>
          }
        />
      ) : null}
    </SectionCard>
  );

  if (!onAction) {
    return content;
  }

  return (
    <Pressable accessibilityRole="button" onPress={onAction} style={({ pressed }) => [styles.pressable, pressed && styles.pressablePressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: radius.md,
  },
  pressablePressed: {
    opacity: 0.92,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: borderWidth.regular,
    borderColor: colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  metaItem: {
    flex: 1,
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
  actionShell: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: borderWidth.regular,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  actionShellHighlighted: {
    borderColor: 'rgba(120, 86, 255, 0.3)',
    backgroundColor: colors.accentSoft,
  },
  actionLabel: {
    ...typography.button,
    color: colors.textPrimary,
  },
});
