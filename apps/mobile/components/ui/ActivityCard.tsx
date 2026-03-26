import { StyleSheet, Text, View } from 'react-native';
import type { StatusBadgeTone } from './StatusBadge';
import { ActionBar } from './ActionBar';
import { LeaderboardAvatar } from './LeaderboardAvatar';
import { SecondaryButton } from './SecondaryButton';
import { SectionCard } from './SectionCard';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';

export interface ActivityCardStat {
  label: string;
  value: string;
  tone?: StatusBadgeTone;
}

interface ActivityCardProps {
  avatarUrl?: string | null | undefined;
  username: string;
  timestamp: string;
  actionLine: string;
  supportLine?: string | undefined;
  stats?: ActivityCardStat[] | undefined;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
}

export function ActivityCard({
  actionLabel,
  actionLine,
  avatarUrl,
  onAction,
  stats,
  supportLine,
  timestamp,
  username,
}: ActivityCardProps) {
  return (
    <SectionCard>
      <View style={styles.header}>
        <View style={styles.identity}>
          <LeaderboardAvatar avatarUrl={avatarUrl} label={username} size="sm" />
          <Text numberOfLines={1} style={styles.username}>
            {username}
          </Text>
        </View>
        <Text style={styles.timestamp}>{timestamp}</Text>
      </View>

      <Text style={styles.actionLine}>{actionLine}</Text>
      {supportLine ? <Text style={styles.supportLine}>{supportLine}</Text> : null}

      {stats && stats.length > 0 ? (
        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={`${stat.label}-${stat.value}`} style={styles.statItem}>
              <View style={[styles.statDot, stat.tone ? dotToneStyles[stat.tone] : dotToneStyles.neutral]} />
              <Text numberOfLines={1} style={styles.statText}>
                {stat.label} {stat.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {actionLabel && onAction ? <ActionBar primary={<SecondaryButton compact label={actionLabel} onPress={onAction} />} /> : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  username: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  timestamp: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  actionLine: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  supportLine: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: borderWidth.regular,
    borderColor: colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    borderWidth: borderWidth.subtle,
  },
  statText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});

const dotToneStyles = StyleSheet.create({
  neutral: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderStrong,
  },
  accent: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  success: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  info: {
    backgroundColor: colors.infoSoft,
    borderColor: colors.info,
  },
  warning: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
});
