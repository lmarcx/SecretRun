import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBottomContentPadding } from '@/hooks/useBottomContentPadding';
import { getAuthErrorMessage, useAuth, type BetaAccessState } from '@/hooks/useAuth';
import { debugAuth, debugAuthError } from '@/services/authDebug';
import { resolveAuthRedirectTarget } from '@/services/authRedirect';
import { colors, fonts, spacing, typography } from '@/theme/tokens';

type FocusedField = 'username' | 'email' | 'password' | 'invite' | null;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirectTo?: string }>();
  const {
    isAuthenticated,
    isAvailable,
    disabledMessage,
    signUp,
    loading,
    betaAccessState,
    betaAccessMessage,
    clearBetaAccessMessage,
    inviteCodeRequired,
  } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);
  const bottomContentPadding = useBottomContentPadding();
  const redirectTarget = resolveAuthRedirectTarget(params.redirectTo, '/events');
  const redirectHref = redirectTarget as Href;

  if (isAuthenticated) {
    return <Redirect href={redirectHref} />;
  }

  const handleRegister = async () => {
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedInviteCode = inviteCode.trim();
    const signUpOptions = {
      displayName: normalizedUsername,
      metadata: {
        username: normalizedUsername,
      },
    };

    debugAuth('register.submit', {
      username: normalizedUsername,
      email: normalizedEmail,
      hasPassword: Boolean(password),
      isAvailable,
      signUpOptions,
      inviteCodeRequired,
    });
    clearBetaAccessMessage();

    if (!normalizedUsername.match(/^[a-z0-9_]{3,20}$/)) {
      setError('Username must be 3-20 characters and use only letters, numbers, or underscores.');
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (inviteCodeRequired && !normalizedInviteCode) {
      setError('Enter your invitation code.');
      return;
    }

    if (!isAvailable) {
      setError(disabledMessage ?? 'Sign-in is not connected in this environment yet.');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await signUp(normalizedEmail, password, signUpOptions, normalizedInviteCode);

      if (response.needsEmailVerification) {
        setSuccess('Account created. Verify your email, then sign in.');
        return;
      }

      router.replace(redirectHref);
    } catch (err) {
      debugAuthError('register.catch', err, {
        username: normalizedUsername,
        email: normalizedEmail,
        signUpOptions,
      });
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
            <View style={styles.topBar}>
              <Pressable
                accessibilityLabel="Go back"
                accessibilityRole="button"
                onPress={() => router.back()}
                style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
              >
                <Ionicons name="arrow-back" size={15} color="rgba(255,255,255,0.60)" />
              </Pressable>
              <Text style={styles.topLabel}>Register</Text>
            </View>

            <View style={styles.hero}>
              <View style={styles.logoWrap}>
                <LinearGradient colors={['#8250FF', '#5F30CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoIcon}>
                  <Ionicons name="walk" size={24} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.logoText}>
                  <Text style={styles.logoName}>Secret Run</Text>
                  <Text style={styles.logoSub}>Closed Beta</Text>
                </View>
              </View>

              <Text style={styles.heroTitle}>Create your{'\n'}account</Text>
              <Text style={styles.heroSub}>Only invited runners can join{'\n'}this beta build.</Text>
            </View>

            <View style={styles.formCard}>
              <LinearGradient colors={['#8250FF', '#B38BFF', 'rgba(130,80,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cardBar} />
              <View style={styles.cardBody}>
                <RegisterField
                  autoCapitalize="none"
                  autoComplete="username"
                  autoCorrect={false}
                  focused={focusedField === 'username'}
                  icon="at"
                  label="Username"
                  onBlur={() => setFocusedField((value) => (value === 'username' ? null : value))}
                  onChangeText={setUsername}
                  onFocus={() => setFocusedField('username')}
                  placeholder="runner_name"
                  textContentType="username"
                  value={username}
                />

                <RegisterField
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  focused={focusedField === 'email'}
                  icon="mail-outline"
                  keyboardType="email-address"
                  label="Email"
                  onBlur={() => setFocusedField((value) => (value === 'email' ? null : value))}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  placeholder="runner@example.com"
                  textContentType="emailAddress"
                  value={email}
                />

                {inviteCodeRequired ? (
                  <RegisterField
                    autoCapitalize="characters"
                    autoCorrect={false}
                    focused={focusedField === 'invite'}
                    icon="ticket-outline"
                    label="Invitation code"
                    onBlur={() => setFocusedField((value) => (value === 'invite' ? null : value))}
                    onChangeText={setInviteCode}
                    onFocus={() => setFocusedField('invite')}
                    placeholder="BETA-INVITE"
                    value={inviteCode}
                  />
                ) : null}

                <RegisterField
                  autoCapitalize="none"
                  autoComplete="new-password"
                  autoCorrect={false}
                  focused={focusedField === 'password'}
                  icon="lock-closed-outline"
                  label="Password"
                  onBlur={() => setFocusedField((value) => (value === 'password' ? null : value))}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onSubmitEditing={() => void handleRegister()}
                  placeholder="At least 8 characters"
                  rightAccessory={
                    <Pressable
                      accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
                      accessibilityRole="button"
                      onPress={() => setPasswordVisible((value) => !value)}
                      style={styles.eyeButton}
                    >
                      <Ionicons name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={17} color="rgba(255,255,255,0.24)" />
                    </Pressable>
                  }
                  secureTextEntry={!passwordVisible}
                  textContentType="newPassword"
                  value={password}
                />

                {!isAvailable ? <StateNotice description={disabledMessage ?? 'Sign-in is not connected in this environment yet.'} tone="muted" /> : null}
                {!error && betaAccessMessage ? <StateNotice description={betaAccessMessage} tone="danger" /> : null}
                {error ? <StateNotice description={error} tone="danger" /> : null}
                {success ? <StateNotice description={success} tone="success" /> : null}

                <View style={styles.sep} />

                <Pressable
                  accessibilityRole="button"
                  disabled={loading || !isAvailable}
                  onPress={() => void handleRegister()}
                  style={({ pressed }) => [styles.ctaButton, pressed && !loading && isAvailable && styles.ctaButtonPressed, (!isAvailable || loading) && styles.ctaButtonDisabled]}
                >
                  <LinearGradient colors={['#8250FF', '#5F30CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGradient}>
                    {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Ionicons name="shield-checkmark-outline" size={18} color="#FFFFFF" />}
                    <Text style={styles.ctaText}>{loading ? 'Creating account...' : 'Create account'}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>

            <View style={styles.orWrap}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.orLine} />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace({ pathname: '/(auth)/login', params: { redirectTo: redirectTarget } })}
              style={({ pressed }) => [styles.signInButton, pressed && styles.signInButtonPressed]}
            >
              <Ionicons name="log-in-outline" size={17} color="rgba(255,255,255,0.42)" />
              <Text style={styles.signInText}>Sign in to existing account</Text>
            </Pressable>

            <View style={styles.betaNote}>
              <Ionicons name="shield-outline" size={16} color="rgba(130,80,255,0.62)" />
              <Text style={styles.betaNoteText}>Only invited runners can create a beta account. Local events still work without signing in.</Text>
            </View>

            {devModeCopy ? (
              <View style={styles.betaNote}>
                <Ionicons name="information-circle-outline" size={16} color="rgba(130,80,255,0.62)" />
                <View style={styles.stateCopy}>
                  <Text style={styles.stateCopyTitle}>{devModeCopy.title}</Text>
                  <Text style={styles.betaNoteText}>{devModeCopy.description}</Text>
                </View>
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

function RegisterField({
  focused,
  icon,
  label,
  rightAccessory,
  ...props
}: TextInputProps & {
  focused: boolean;
  icon: IoniconName;
  label: string;
  rightAccessory?: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputRow, focused && styles.inputRowFocused]}>
        <Ionicons name={icon} size={17} color={focused ? 'rgba(130,80,255,0.72)' : 'rgba(255,255,255,0.24)'} />
        <TextInput
          placeholderTextColor="rgba(255,255,255,0.24)"
          selectionColor="#8250FF"
          style={styles.input}
          {...props}
        />
        {rightAccessory}
      </View>
    </View>
  );
}

function StateNotice({ description, tone }: { description: string; tone: 'muted' | 'danger' | 'success' }) {
  return (
    <View style={[styles.notice, noticeTone[tone].box]}>
      <Text style={[styles.noticeText, noticeTone[tone].text]}>{description}</Text>
    </View>
  );
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getDeviceStateCopy(betaAccessState: BetaAccessState, disabledMessage: string | null | undefined) {
  switch (betaAccessState) {
    case 'dev_runner':
      return {
        title: 'DEV runner stays local',
        description: 'Local event testing still works here. Create an account when you need synced access.',
      };
    case 'beta_blocked':
      return {
        title: 'Invitation required',
        description: 'Only invited accounts can use this build outside local DEV runner mode.',
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
    backgroundColor: '#060608',
  },
  keyboard: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    backgroundColor: '#08080F',
    paddingBottom: spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  backButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  backButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  topLabel: {
    fontSize: 13,
    fontFamily: fonts.dmSans600,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)',
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  logoIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  logoText: {
    gap: 2,
  },
  logoName: {
    fontSize: 15,
    fontFamily: fonts.syne800,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: '#FFFFFF',
  },
  logoSub: {
    fontSize: 10,
    fontFamily: fonts.dmSans600,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.30)',
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 29,
    fontFamily: fonts.syne800,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroSub: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 21,
    fontFamily: fonts.dmSans400,
    color: 'rgba(255,255,255,0.32)',
  },
  formCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#111018',
  },
  cardBar: {
    height: 2,
  },
  cardBody: {
    padding: 18,
  },
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    marginBottom: 7,
    fontSize: 9,
    fontFamily: fonts.dmSans600,
    fontWeight: '700',
    letterSpacing: 1.08,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.28)',
  },
  inputRow: {
    minHeight: 47,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 14,
  },
  inputRowFocused: {
    borderColor: 'rgba(130,80,255,0.50)',
    backgroundColor: 'rgba(130,80,255,0.05)',
  },
  input: {
    flex: 1,
    minHeight: 47,
    paddingVertical: 0,
    fontSize: 14,
    fontFamily: fonts.dmSans400,
    color: 'rgba(255,255,255,0.76)',
  },
  eyeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 2,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeText: {
    ...typography.bodySm,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    marginTop: 2,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  ctaButton: {
    overflow: 'hidden',
    borderRadius: 12,
    shadowColor: '#8250FF',
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  ctaButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  ctaButtonDisabled: {
    opacity: 0.55,
  },
  ctaGradient: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
  },
  ctaText: {
    fontSize: 15,
    fontFamily: fonts.syne800,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: '#FFFFFF',
  },
  orWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  orText: {
    fontSize: 12,
    fontFamily: fonts.dmSans400,
    color: 'rgba(255,255,255,0.20)',
  },
  signInButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 14,
  },
  signInButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  signInText: {
    fontSize: 14,
    fontFamily: fonts.dmSans600,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.42)',
  },
  betaNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(130,80,255,0.16)',
    backgroundColor: 'rgba(130,80,255,0.07)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  betaNoteText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 18,
    fontFamily: fonts.dmSans400,
    color: 'rgba(255,255,255,0.28)',
  },
  stateCopy: {
    flex: 1,
    gap: 3,
  },
  stateCopyTitle: {
    ...typography.eyebrow,
    color: colors.textMuted,
  },
});

const noticeStyles = StyleSheet.create({
  mutedBox: {
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  mutedText: {
    color: 'rgba(255,255,255,0.38)',
  },
  dangerBox: {
    borderColor: 'rgba(248,113,113,0.28)',
    backgroundColor: 'rgba(248,113,113,0.10)',
  },
  dangerText: {
    color: '#FCA5A5',
  },
  successBox: {
    borderColor: 'rgba(52,211,153,0.28)',
    backgroundColor: 'rgba(52,211,153,0.10)',
  },
  successText: {
    color: '#6EE7B7',
  },
});

const noticeTone = {
  muted: {
    box: noticeStyles.mutedBox,
    text: noticeStyles.mutedText,
  },
  danger: {
    box: noticeStyles.dangerBox,
    text: noticeStyles.dangerText,
  },
  success: {
    box: noticeStyles.successBox,
    text: noticeStyles.successText,
  },
} as const;
