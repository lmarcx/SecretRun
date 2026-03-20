import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme/tokens';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xxs,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
});
