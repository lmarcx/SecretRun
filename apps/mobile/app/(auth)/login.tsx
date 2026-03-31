import { useState } from 'react';
import { Redirect, Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Text } from 'react-native';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import {
  AuthDivider,
  AuthField,
  AuthNotice,
  AuthScreenLayout,
} from '@/components/ui/AuthScreenLayout';
import { SectionCard } from '@/components/ui/SectionCard';
import { getAuthErrorMessage, useAuth, type BetaAccessState } from '@/hooks/useAuth';
import { debugAuth, debugAuthError } from '@/services/authDebug';
import { resolveAuthRedirectTarget } from '@/services/authRedirect';
import { colors, typography } from '@/theme/tokens';

type FocusedField = 'email' | 'password' | null;

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirectTo?: string }>();
  const { isAuthenticated, isAvailable, disabledMessage, signIn, loading, betaAccessState, betaAccessMessage, clearBetaAccessMessage } =
    useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);

  const redirectTarget = resolveAuthRedirectTarget(params.redirectTo, '/feed');
  const redirectHref = redirectTarget as Href;

  if (isAuthenticated) {
    return <Redirect href={redirectHref} />;
  }

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    debugAuth('login.submit', {
      email: normalizedEmail,
      hasPassword: Boolean(password),
      isAvailable,
    });
    clearBetaAccessMessage();

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

      router.replace(redirectHref);
    } catch (err) {
      debugAuthError('login.catch', err, {
        email: normalizedEmail,
      });
      setError(getAuthErrorMessage(err));
    }
  };

  const devModeCopy = getDeviceStateCopy(betaAccessState, disabledMessage);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AuthScreenLayout
        cardSubtitle="Use your beta account to continue."
        cardTitle="Sign in to your account"
        onBack={() => router.back()}
        subtitle="Closed beta access now requires an invited account."
        support={
          devModeCopy ? (
            <SectionCard tone="muted">
              <Text style={styles.supportTitle}>{devModeCopy.title}</Text>
              <Text style={styles.supportDescription}>{devModeCopy.description}</Text>
            </SectionCard>
          ) : null
        }
        title="Sign in"
      >
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

        {!isAvailable ? <AuthNotice description={disabledMessage ?? 'Sign-in is not connected in this environment yet.'} tone="muted" /> : null}
        {!error && betaAccessMessage ? <AuthNotice description={betaAccessMessage} tone="danger" /> : null}
        {error ? <AuthNotice description={error} tone="danger" /> : null}

        <PrimaryButton
          disabled={loading || !isAvailable}
          label={loading ? 'Signing in...' : 'Sign in'}
          onPress={() => void handleLogin()}
        />

        <AuthDivider />

        <SecondaryButton
          label="Create account"
          onPress={() => router.push({ pathname: '/(auth)/register', params: { redirectTo: redirectTarget } })}
        />
      </AuthScreenLayout>
    </>
  );
}

function getDeviceStateCopy(betaAccessState: BetaAccessState, disabledMessage: string | null | undefined) {
  switch (betaAccessState) {
    case 'dev_runner':
      return {
        title: 'DEV runner active',
        description: 'Local event testing stays available on this device. Sign in when you need synced account access.',
      };
    case 'beta_blocked':
      return {
        title: 'Beta access required',
        description: 'Only invited accounts can open this build outside local DEV runner mode.',
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

const styles = {
  supportTitle: {
    ...typography.eyebrow,
    color: colors.textMuted,
  },
  supportDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
};
