import { useState } from 'react';
import { Redirect, Stack, useRouter } from 'expo-router';
import { Text } from 'react-native';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import {
  AuthDivider,
  AuthField,
  AuthNotice,
  AuthScreenLayout,
  AuthTertiaryButton,
} from '@/components/ui/AuthScreenLayout';
import { SectionCard } from '@/components/ui/SectionCard';
import { getAuthErrorMessage, useAuth, type BetaAccessState } from '@/hooks/useAuth';
import { colors, typography } from '@/theme/tokens';

type FocusedField = 'email' | 'password' | null;

export default function LoginScreen() {
  const router = useRouter();
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
      <AuthScreenLayout
        cardSubtitle="Use your beta account to continue."
        cardTitle="Sign in to your account"
        footer={<AuthTertiaryButton label="Continue as guest" onPress={() => router.replace('/events')} />}
        onBack={() => router.back()}
        subtitle="Unlock your feed, profile, and team identity."
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
        {error ? <AuthNotice description={error} tone="danger" /> : null}

        <PrimaryButton
          disabled={loading || !isAvailable}
          label={loading ? 'Signing in...' : 'Sign in'}
          onPress={() => void handleLogin()}
        />

        <AuthDivider />

        <SecondaryButton label="Create account" onPress={() => router.push('/(auth)/register')} />
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
