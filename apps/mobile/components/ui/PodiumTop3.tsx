import { Image, StyleSheet, Text, View } from 'react-native';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';

export interface PodiumEntry {
  id: string;
  title: string;
  points: number;
  avatarUrl?: string | null | undefined;
  variant: 'user' | 'team';
}

interface PodiumTop3Props {
  entries: PodiumEntry[];
  highlightId?: string | null;
}

const SILVER = '#8A9BB8';
const BRONZE = '#B07840';

const SLOT_CONFIG = [
  { rank: 1, color: colors.accent, soft: colors.accentSoft, platformH: 96, size: 58 },
  { rank: 2, color: SILVER, soft: 'rgba(138,155,184,0.14)' as const, platformH: 68, size: 46 },
  { rank: 3, color: BRONZE, soft: 'rgba(176,120,64,0.14)' as const, platformH: 52, size: 46 },
] as const;

// display order: rank2 left, rank1 center, rank3 right
const DISPLAY_ORDER = [1, 0, 2] as const;

export function PodiumTop3({ entries, highlightId }: PodiumTop3Props) {
  return (
    <View style={styles.container}>
      {DISPLAY_ORDER.map((entryIdx) => {
        const cfg = SLOT_CONFIG[entryIdx];
        const entry = entries[entryIdx];
        const isMe = entry?.id === highlightId;
        const borderColor = isMe ? colors.accent : cfg.color;

        return (
          <View key={cfg.rank} style={styles.slot}>
            {cfg.rank === 1 && <Text style={styles.crown}>♛</Text>}

            {entry ? (
              <>
                <View
                  style={[
                    styles.avatarRing,
                    {
                      width: cfg.size + 4,
                      height: cfg.size + 4,
                      borderRadius: (cfg.size + 4) / 2,
                      borderColor,
                    },
                  ]}
                >
                  <AvatarInner entry={entry} size={cfg.size} soft={cfg.soft} />
                </View>

                <Text numberOfLines={1} style={[styles.name, cfg.rank === 1 && styles.nameLg]}>
                  {entry.title}
                </Text>
                <Text style={[styles.pts, { color: cfg.color }]}>{entry.points.toLocaleString()}</Text>
              </>
            ) : (
              <View style={{ width: cfg.size, height: cfg.size }} />
            )}

            <View
              style={[
                styles.platform,
                { height: cfg.platformH, borderColor: cfg.color, backgroundColor: cfg.soft },
              ]}
            >
              <Text style={[styles.rankNum, { color: cfg.color }]}>#{cfg.rank}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function AvatarInner({ entry, size, soft }: { entry: PodiumEntry; size: number; soft: string }) {
  const r = size / 2;

  if (entry.avatarUrl && entry.variant === 'user') {
    return (
      <Image source={{ uri: entry.avatarUrl }} style={{ width: size, height: size, borderRadius: r }} />
    );
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: r, backgroundColor: soft }]}>
      <Text style={[styles.initial, size > 50 && styles.initialLg]}>
        {entry.title.trim().charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingTop: spacing.xl,
    gap: spacing.xs,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  crown: {
    fontSize: 20,
    lineHeight: 24,
    color: colors.accent,
    // fontFamily: 'Syne_700Bold', — enable after: npx expo install @expo-google-fonts/syne expo-font
  },
  avatarRing: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    ...typography.badge,
    color: colors.textPrimary,
  },
  initialLg: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
  },
  name: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xxs,
  },
  nameLg: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    // fontFamily: 'Syne_700Bold',
  },
  pts: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  platform: {
    width: '100%',
    borderTopWidth: borderWidth.regular,
    borderLeftWidth: borderWidth.regular,
    borderRightWidth: borderWidth.regular,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNum: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '800',
    // fontFamily: 'Syne_700Bold',
  },
});
