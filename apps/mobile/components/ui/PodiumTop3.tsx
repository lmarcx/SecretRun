import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing } from '@/theme/tokens';

export interface PodiumEntry {
  id: string;
  title: string;
  points: number;
  avatarUrl?: string | null | undefined;
  variant: 'user' | 'team';
}

interface PodiumTop3Props {
  entries: PodiumEntry[];
  highlightId?: string | null | undefined;
}

const SLOT = [
  {
    rank: 1,
    order: 2, // center
    ringColor: '#FFD700',
    ringGlow: 'rgba(255,215,0,0.3)',
    badgeBg: 'rgba(255,215,0,0.15)',
    badgeText: '#FFD700',
    badgeBorder: 'rgba(255,215,0,0.3)',
    barFrom: 'rgba(255,215,0,0.20)' as const,
    barTo: 'rgba(255,215,0,0.05)' as const,
    barBorder: 'rgba(255,215,0,0.40)',
    barH: 52,
    avatarSize: 52,
  },
  {
    rank: 2,
    order: 1, // left
    ringColor: '#C0C0C0',
    ringGlow: undefined,
    badgeBg: 'rgba(192,192,192,0.12)',
    badgeText: '#C8C8C8',
    badgeBorder: 'rgba(192,192,192,0.25)',
    barFrom: 'rgba(192,192,192,0.15)' as const,
    barTo: 'rgba(192,192,192,0.03)' as const,
    barBorder: 'rgba(192,192,192,0.30)',
    barH: 36,
    avatarSize: 44,
  },
  {
    rank: 3,
    order: 3, // right
    ringColor: '#CD7F32',
    ringGlow: undefined,
    badgeBg: 'rgba(205,127,50,0.12)',
    badgeText: '#CD9A50',
    badgeBorder: 'rgba(205,127,50,0.25)',
    barFrom: 'rgba(205,127,50,0.15)' as const,
    barTo: 'rgba(205,127,50,0.03)' as const,
    barBorder: 'rgba(205,127,50,0.25)',
    barH: 24,
    avatarSize: 44,
  },
] as const;

// display order: rank2 (left), rank1 (center), rank3 (right)
const DISPLAY = [1, 0, 2] as const;

export function PodiumTop3({ entries, highlightId }: PodiumTop3Props) {
  return (
    <View style={styles.container}>
      {DISPLAY.map((idx) => {
        const cfg = SLOT[idx];
        const entry = entries[idx];

        return (
          <View key={cfg.rank} style={styles.slot}>
            {entry ? (
              <>
                {cfg.rank === 1 && <Text style={styles.crown}>👑</Text>}

                <View style={styles.avatarWrap}>
                  <PodiumAvatar
                    entry={entry}
                    isMe={entry.id === highlightId}
                    size={cfg.avatarSize}
                  />
                  <View
                    style={[
                      styles.ring,
                      {
                        inset: cfg.rank === 1 ? -4 : -3,
                        borderColor: entry.id === highlightId ? colors.accent : cfg.ringColor,
                      },
                      cfg.ringGlow
                        ? {
                            shadowColor: cfg.ringGlow,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 1,
                            shadowRadius: 8,
                            elevation: 6,
                          }
                        : null,
                    ]}
                  />
                </View>

                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: cfg.badgeBg,
                      borderColor: cfg.badgeBorder,
                    },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: cfg.badgeText }]}>#{cfg.rank}</Text>
                </View>

                <Text numberOfLines={1} style={styles.name}>
                  {entry.title}
                </Text>
                <Text style={styles.pts}>{entry.points.toLocaleString()} pts</Text>
              </>
            ) : (
              <View style={{ width: cfg.avatarSize, height: cfg.avatarSize }} />
            )}

            <LinearGradient
              colors={[cfg.barFrom, cfg.barTo]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[styles.bar, { height: cfg.barH, borderTopColor: cfg.barBorder }]}
            />
          </View>
        );
      })}
    </View>
  );
}

function PodiumAvatar({
  entry,
  isMe,
  size,
}: {
  entry: PodiumEntry;
  isMe: boolean;
  size: number;
}) {
  const r = size / 2;
  const initial = entry.title.trim().charAt(0).toUpperCase() || '?';

  if (entry.avatarUrl && entry.variant === 'user') {
    return (
      <Image
        source={{ uri: entry.avatarUrl }}
        style={{ width: size, height: size, borderRadius: r }}
      />
    );
  }

  // Deterministic avatar color from initial
  const bg = (AVATAR_COLORS[initial.charCodeAt(0) % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]) as [string, string];

  return (
    <LinearGradient
      colors={bg}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: r, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={[styles.initial, size > 48 && styles.initialLg]}>{initial}</Text>
    </LinearGradient>
  );
}

const AVATAR_COLORS: [string, string][] = [
  ['#FF6B53', '#FF9853'],
  ['#4A90D9', '#6AB0F5'],
  ['#4ECCA3', '#2EAF84'],
  ['#F5A623', '#F5C823'],
  ['#9B59B6', '#C39BD3'],
  ['#E74C3C', '#F1948A'],
];

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  crown: {
    fontSize: 14,
    lineHeight: 18,
  },
  avatarWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 2,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeText: {
    fontFamily: fonts.syne800,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.2,
  },
  name: {
    fontFamily: fonts.dmSans600,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    width: '100%',
  },
  pts: {
    fontFamily: fonts.dmSans400,
    fontSize: 11,
    lineHeight: 15,
    color: 'rgba(255,255,255,0.45)',
  },
  bar: {
    width: '100%',
    borderTopWidth: 2,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  initial: {
    fontFamily: fonts.dmSans600,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  initialLg: {
    fontSize: 18,
  },
});
