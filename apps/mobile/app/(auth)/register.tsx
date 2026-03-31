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

type FocusedField = 'username' | 'email' | 'password' | 'invite' | null;

export default function RegisterScreen() {
  const router = useRouter();
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);

  if (isAuthenticated) {
    return <Redirect href="/events" />;
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
      inviteCodeRequired,
    });
    clearBetaAccessMessage();

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

    if (inviteCodeRequired && !inviteCode.trim()) {
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
      const response = await signUp(normalizedEmail, password, signUpOptions, inviteCode);

      if (response.needsEmailVerification) {
        setSuccess('Account created. Verify your email, then sign in.');
        return;
      }

      router.replace('/events');
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
        cardSubtitle={inviteCodeRequired ? 'Invitation code required for this closed beta.' : 'Create your beta account to continue.'}
        cardTitle="Create your account"
        onBack={() => router.back()}
        subtitle="Only invited runners can create a beta account in this build."
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

        {inviteCodeRequired ? (
          <AuthField
            autoCapitalize="characters"
            autoCorrect={false}
            focused={focusedField === 'invite'}
            label="Invitation code"
            onBlur={() => setFocusedField((value) => (value === 'invite' ? null : value))}
            onChangeText={setInviteCode}
            onFocus={() => setFocusedField('invite')}
            placeholder="BETA-INVITE"
            value={inviteCode}
          />
        ) : null}

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
        {!error && betaAccessMessage ? <AuthNotice description={betaAccessMessage} tone="danger" /> : null}
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
