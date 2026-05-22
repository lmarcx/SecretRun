import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomContentPadding } from '@/hooks/useBottomContentPadding';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';
import { SectionCard } from './SectionCard';

interface AuthScreenLayoutProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  cardTitle: string;
  cardSubtitle?: string;
  onBack: () => void;
  footer?: ReactNode;
  support?: ReactNode;
}

export function AuthScreenLayout({
  cardSubtitle,
  cardTitle,
  children,
  eyebrow = 'Secret Run',
  footer,
  onBack,
  subtitle,
  support,
  title,
}: AuthScreenLayoutProps) {
  const bottomContentPadding = useBottomContentPadding();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          bounces={false}
          contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}>
              <Text style={styles.backButtonLabel}>Back</Text>
            </Pressable>
          </View>

          <View style={styles.hero}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>

          <SectionCard {...(cardSubtitle ? { subtitle: cardSubtitle } : {})} title={cardTitle}>
            <View style={styles.form}>{children}</View>
          </SectionCard>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
          {support}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthField({
  focused = false,
  label,
  ...props
}: ComponentProps<typeof TextInput> & {
  focused?: boolean;
  label: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        style={[styles.input, focused && styles.inputFocused]}
        {...props}
      />
    </View>
  );
}

export function AuthNotice({
  description,
  tone,
}: {
  description: string;
  tone: 'muted' | 'danger' | 'success';
}) {
  return (
    <View style={[styles.notice, toneVariants[tone].notice]}>
      <Text style={[styles.noticeText, toneVariants[tone].text]}>{description}</Text>
    </View>
  );
}

export function AuthDivider({ label = 'or' }: { label?: string }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerLabel}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

export function AuthTertiaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.tertiaryButton, pressed && styles.tertiaryButtonPressed]}>
      <Text style={styles.tertiaryButtonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboard: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  header: {
    alignItems: 'flex-start',
  },
  backButton: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: borderWidth.regular,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
  },
  backButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
  },
  backButtonLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  hero: {
    gap: spacing.xs,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.textMuted,
  },
  title: {
    ...typography.heroTitle,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    maxWidth: 320,
  },
  form: {
    gap: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.eyebrow,
    color: colors.textMuted,
  },
  input: {
    minHeight: 54,
    borderRadius: radius.lg,
    borderWidth: borderWidth.regular,
    borderColor: colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
  },
  inputFocused: {
    borderColor: 'rgba(139, 92, 246, 0.55)',
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
  },
  notice: {
    borderRadius: radius.md,
    borderWidth: borderWidth.regular,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  noticeText: {
    ...typography.bodySm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: borderWidth.subtle,
    backgroundColor: colors.border,
  },
  dividerLabel: {
    ...typography.bodySm,
    color: colors.textMuted,
    textTransform: 'lowercase',
  },
  footer: {
    alignItems: 'center',
  },
  tertiaryButton: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: borderWidth.regular,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tertiaryButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  tertiaryButtonLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});

const toneStyles = StyleSheet.create({
  mutedNotice: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  mutedText: {
    color: colors.textSecondary,
  },
  dangerNotice: {
    borderColor: 'rgba(248, 113, 113, 0.32)',
    backgroundColor: colors.dangerSoft,
  },
  dangerText: {
    color: colors.danger,
  },
  successNotice: {
    borderColor: 'rgba(52, 211, 153, 0.30)',
    backgroundColor: colors.successSoft,
  },
  successText: {
    color: colors.success,
  },
});

const toneVariants = {
  muted: {
    notice: toneStyles.mutedNotice,
    text: toneStyles.mutedText,
  },
  danger: {
    notice: toneStyles.dangerNotice,
    text: toneStyles.dangerText,
  },
  success: {
    notice: toneStyles.successNotice,
    text: toneStyles.successText,
  },
} as const;
