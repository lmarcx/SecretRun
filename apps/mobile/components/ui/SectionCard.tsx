import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';

type SectionCardTone = 'default' | 'muted' | 'accent';

interface SectionCardProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
  accessory?: ReactNode;
  tone?: SectionCardTone;
}

export function SectionCard({ accessory, children, subtitle, title, tone = 'default' }: SectionCardProps) {
  return (
    <View style={[styles.card, toneStyles[tone]]}>
      <View pointerEvents="none" style={[styles.topHighlight, tone === 'accent' && styles.topHighlightAccent]} />
      {title || subtitle || accessory ? (
        <View style={styles.header}>
          <View style={styles.copy}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {accessory}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: borderWidth.regular,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 3,
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
  topHighlightAccent: {
    backgroundColor: 'rgba(139, 92, 246, 0.22)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
});

const toneStyles = StyleSheet.create({
  default: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  muted: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  accent: {
    borderColor: 'rgba(139, 92, 246, 0.28)',
    backgroundColor: colors.surfaceElevated,
  },
});
