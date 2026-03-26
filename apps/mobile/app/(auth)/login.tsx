import { useState } from 'react';
import { Redirect, Stack, useRouter } from 'expo-router';
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
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { useBottomContentPadding } from '@/hooks/useBottomContentPadding';
import { getAuthErrorMessage, useAuth, type BetaAccessState } from '@/hooks/useAuth';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';

type FocusedField = 'email' | 'password' | null;

export default function LoginScreen() {
  const router = useRouter();
  const bottomContentPadding = useBottomContentPadding();
  const { isAuthenticated, isAvailable, disabledMessage, signIn, loading, betaAccessState } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);

  if (isAuthenticated) {
    return <Redirect href="/events" />;
  }

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError('Enter your email and password.');
      return;
    }

    if (!isAvailable) {
      setError(disabledMessage ?? 'Sign-in is not connected in this environment yet.');
      return;
    }

    setError(null);

    try {
      const response = await signIn(normalizedEmail, password);

      if (response.needsEmailVerification) {
        setError('Verify your email before signing in.');
        return;
      }

      if (response.needsMfaOtp) {
        setError('This beta does not support multi-factor sign-in yet.');
        return;
      }

      router.replace('/events');
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  };

  const devModeCopy = getDeviceStateCopy(betaAccessState, disabledMessage);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
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
              <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}>
                <Text style={styles.backButtonLabel}>Back</Text>
              </Pressable>
            </View>

            <View style={styles.hero}>
              <Text style={styles.eyebrow}>Secret Run</Text>
              <Text style={styles.title}>Sign in</Text>
              <Text style={styles.subtitle}>Unlock your feed, profile, and team identity.</Text>
            </View>

            <SectionCard subtitle="Use your beta account to continue." title="Sign in to your account">
              <View style={styles.form}>
                <AuthField
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  focused={focusedField === 'email'}
                  keyboardType="email-address"
                  label="Email"
                  onBlur={() => setFocusedField((value) => (value === 'email' ? null : value))}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  placeholder="runner@example.com"
                  textContentType="emailAddress"
                  value={email}
                />

                <AuthField
                  autoCapitalize="none"
                  autoComplete="password"
                  autoCorrect={false}
                  focused={focusedField === 'password'}
                  label="Password"
                  onBlur={() => setFocusedField((value) => (value === 'password' ? null : value))}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onSubmitEditing={() => void handleLogin()}
                  placeholder="Password"
                  secureTextEntry
                  textContentType="password"
                  value={password}
                />

                {!isAvailable ? (
                  <InlineNotice description={disabledMessage ?? 'Sign-in is not connected in this environment yet.'} tone="muted" />
                ) : null}
                {error ? <InlineNotice description={error} tone="danger" /> : null}

                <PrimaryButton
                  disabled={loading || !isAvailable}
                  label={loading ? 'Signing in...' : 'Sign in'}
                  onPress={() => void handleLogin()}
                />

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerLabel}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <SecondaryButton label="Create account" onPress={() => router.push('/(auth)/register')} />
              </View>
            </SectionCard>

            <View style={styles.guestWrap}>
              <Pressable accessibilityRole="button" onPress={() => router.replace('/events')} style={({ pressed }) => [styles.guestButton, pressed && styles.guestButtonPressed]}>
                <Text style={styles.guestButtonLabel}>Continue as guest</Text>
              </Pressable>
            </View>

            {devModeCopy ? (
              <SectionCard tone="muted">
                <Text style={styles.devModeLabel}>{devModeCopy.title}</Text>
                <Text style={styles.devModeDescription}>{devModeCopy.description}</Text>
              </SectionCard>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

function AuthField({
  focused,
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  focused: boolean;
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

function InlineNotice({
  description,
  tone,
}: {
  description: string;
  tone: 'muted' | 'danger';
}) {
  return (
    <View style={[styles.notice, tone === 'danger' ? styles.noticeDanger : styles.noticeMuted]}>
      <Text style={[styles.noticeText, tone === 'danger' ? styles.noticeTextDanger : styles.noticeTextMuted]}>{description}</Text>
    </View>
  );
}

function getDeviceStateCopy(betaAccessState: BetaAccessState, disabledMessage: string | null | undefined) {
  switch (betaAccessState) {
    case 'dev_runner':
      return {
        title: 'DEV runner active',
        description: 'Local event testing stays available on this device. Sign in when you need synced account access.',
      };
    case 'auth_unavailable':
      return {
        title: 'Auth unavailable',
        description: disabledMessage ?? 'This environment is still guest-only right now.',
      };
    case 'signed_out':
    case 'loading':
    case 'signed_in':
    default:
      return null;
  }
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
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
  },
  backButtonPressed: {
    backgroundColor: colors.surface,
  },
  backButtonLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
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
    borderRadius: radius.md,
    borderWidth: borderWidth.regular,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
  },
  inputFocused: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  notice: {
    borderRadius: radius.md,
    borderWidth: borderWidth.regular,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  noticeMuted: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  noticeDanger: {
    borderColor: 'rgba(255, 124, 147, 0.32)',
    backgroundColor: colors.dangerSoft,
  },
  noticeText: {
    ...typography.bodySm,
  },
  noticeTextMuted: {
    color: colors.textSecondary,
  },
  noticeTextDanger: {
    color: colors.danger,
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
  guestWrap: {
    alignItems: 'center',
  },
  guestButton: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: borderWidth.regular,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestButtonPressed: {
    backgroundColor: colors.surface,
  },
  guestButtonLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  devModeLabel: {
    ...typography.eyebrow,
    color: colors.textMuted,
  },
  devModeDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});
