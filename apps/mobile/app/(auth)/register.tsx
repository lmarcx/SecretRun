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
} from '@/components/ui/AuthScreenLayout';
import { SectionCard } from '@/components/ui/SectionCard';
import { getAuthErrorMessage, useAuth, type BetaAccessState } from '@/hooks/useAuth';
import { debugAuth, debugAuthError } from '@/services/authDebug';
import { colors, typography } from '@/theme/tokens';

type FocusedField = 'username' | 'email' | 'password' | null;

export default function RegisterScreen() {
  const router = useRouter();
  const { isAuthenticated, isAvailable, disabledMessage, signUp, loading, betaAccessState } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);

  if (isAuthenticated) {
    return <Redirect href="/feed" />;
  }

  const handleRegister = async () => {
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();
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
    });

    if (!normalizedUsername.match(/^[a-z0-9_]{3,20}$/)) {
      setError('Username must be 3-20 characters and use only letters, numbers, or underscores.');
      return;
    }

    if (!normalizedEmail.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!isAvailable) {
      setError(disabledMessage ?? 'Sign-in is not connected in this environment yet.');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await signUp(normalizedEmail, password, signUpOptions);

      if (response.needsEmailVerification) {
        setSuccess('Account created. Verify your email, then sign in.');
        return;
      }

      router.replace('/feed');
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
      <AuthScreenLayout
        cardSubtitle="Create your beta account to continue."
        cardTitle="Create your account"
        onBack={() => router.back()}
        subtitle="Set your sign-in now. Runner profile details can wait."
        support={
          devModeCopy ? (
            <SectionCard tone="muted">
              <Text style={styles.supportTitle}>{devModeCopy.title}</Text>
              <Text style={styles.supportDescription}>{devModeCopy.description}</Text>
            </SectionCard>
          ) : null
        }
        title="Create account"
      >
        <AuthField
          autoCapitalize="none"
          autoCorrect={false}
          focused={focusedField === 'username'}
          label="Username"
          onBlur={() => setFocusedField((value) => (value === 'username' ? null : value))}
          onChangeText={setUsername}
          onFocus={() => setFocusedField('username')}
          placeholder="runner_name"
          value={username}
        />

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
          onSubmitEditing={() => void handleRegister()}
          placeholder="At least 8 characters"
          secureTextEntry
          textContentType="newPassword"
          value={password}
        />

        {!isAvailable ? <AuthNotice description={disabledMessage ?? 'Sign-in is not connected in this environment yet.'} tone="muted" /> : null}
        {error ? <AuthNotice description={error} tone="danger" /> : null}
        {success ? <AuthNotice description={success} tone="success" /> : null}

        <PrimaryButton
          disabled={loading || !isAvailable}
          label={loading ? 'Creating account...' : 'Create account'}
          onPress={() => void handleRegister()}
        />

        <AuthDivider />

        <SecondaryButton label="Sign in" onPress={() => router.replace('/(auth)/login')} />
      </AuthScreenLayout>
    </>
  );
}

function getDeviceStateCopy(betaAccessState: BetaAccessState, disabledMessage: string | null | undefined) {
  switch (betaAccessState) {
    case 'dev_runner':
      return {
        title: 'DEV runner stays local',
        description: 'Local event testing still works here. Create an account when you need synced access.',
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
