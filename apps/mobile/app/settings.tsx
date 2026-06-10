import { StyleSheet, View } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useBottomContentPadding } from '@/hooks/useBottomContentPadding';
import { colors, spacing, typography } from '@/theme/tokens';

export default function SettingsScreen() {
  const bottomContentPadding = useBottomContentPadding();

  return (
    <AppScreen contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}>
      <ScreenHeader title="Settings" subtitle="Account and device preferences." />

      <View style={styles.section}>
        <SectionHeader title="Preferences" subtitle="More controls land here next." />
        <SectionCard tone="muted">
          <EmptyState
            title="Settings soon"
            description="Notification controls, privacy, and account preferences will expand here."
          />
        </SectionCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  title: {
    ...typography.heroTitle,
    color: colors.textPrimary,
  },
  info: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
