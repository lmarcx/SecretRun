import { Image, StyleSheet, Text, View } from 'react-native';
import { borderWidth, colors, radius, typography } from '@/theme/tokens';

type LeaderboardAvatarVariant = 'user' | 'team';

interface LeaderboardAvatarProps {
  label: string;
  avatarUrl?: string | null | undefined;
  variant?: LeaderboardAvatarVariant;
  size?: 'sm' | 'md';
}

export function LeaderboardAvatar({
  avatarUrl,
  label,
  size = 'md',
  variant = 'user',
}: LeaderboardAvatarProps) {
  const initial = label.trim().charAt(0).toUpperCase() || '?';

  if (avatarUrl && variant === 'user') {
    return <Image source={{ uri: avatarUrl }} style={[styles.image, frameStyles[size], styles.userFrame]} />;
  }

  return (
    <View style={[styles.fallback, frameStyles[size], variant === 'team' ? styles.teamFrame : styles.userFrame]}>
      <Text style={[styles.initial, textStyles[size]]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: borderWidth.regular,
  },
  userFrame: {
    borderRadius: radius.pill,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
  },
  teamFrame: {
    borderRadius: radius.sm,
    borderColor: 'rgba(120, 86, 255, 0.2)',
    backgroundColor: colors.surfaceElevated,
  },
  initial: {
    ...typography.badge,
    color: colors.textPrimary,
  },
  image: {
    borderWidth: borderWidth.regular,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
});

const frameStyles = StyleSheet.create({
  sm: {
    width: 34,
    height: 34,
  },
  md: {
    width: 42,
    height: 42,
  },
});

const textStyles = StyleSheet.create({
  sm: {
    fontSize: 12,
    lineHeight: 14,
  },
  md: {
    fontSize: 14,
    lineHeight: 18,
  },
});
