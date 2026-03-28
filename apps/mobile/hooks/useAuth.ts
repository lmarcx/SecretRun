import { useAuthenticationStatus, useSignInEmailPassword, useSignOut, useSignUpEmailPassword } from '@nhost/react';
import { useEffect } from 'react';
import { debugAuth, debugAuthError } from '@/services/authDebug';
import { isDevRunnerActive } from '@/services/devRunnerMode';
import { getAuthUrl, nhostConfig } from '@/services/nhostClient';

export type AuthState = 'unconfigured' | 'loading' | 'signed in' | 'signed out';
export type BetaAccessState = 'loading' | 'signed_in' | 'signed_out' | 'dev_runner' | 'auth_unavailable';

export function useAuth() {
  const { isAuthenticated, isLoading: authLoading } = useAuthenticationStatus();
  const { signInEmailPassword, isLoading: signInLoading, error: signInError } = useSignInEmailPassword();
  const { signUpEmailPassword, isLoading: signUpLoading, error: signUpError } = useSignUpEmailPassword();
  const { signOut } = useSignOut();
  const devRunnerActive = isDevRunnerActive();
  const loading = authLoading || signInLoading || signUpLoading;

  const signIn = async (email: string, password: string) => {
    debugAuth('signIn.request', {
      email,
      authUrl: getAuthUrl(),
      isAuthEnabled: nhostConfig.isAuthEnabled,
    });

    if (!nhostConfig.isAuthEnabled) {
      const error = new Error(nhostConfig.authDisabledMessage ?? 'Sign-in is not connected in this environment yet.');
      debugAuthError('signIn.disabled', error, {
        authUrl: getAuthUrl(),
      });
      throw error;
    }

    try {
      const response = await signInEmailPassword(email, password);
      debugAuth('signIn.response', response);

      if (response.error) {
        debugAuthError('signIn.response.error', response.error, { response });
        throw response.error;
      }

      return response;
    } catch (error) {
      debugAuthError('signIn.throw', error, {
        email,
        authUrl: getAuthUrl(),
      });
      throw error;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    options?: Parameters<typeof signUpEmailPassword>[2],
  ) => {
    debugAuth('signUp.request', {
      email,
      authUrl: getAuthUrl(),
      isAuthEnabled: nhostConfig.isAuthEnabled,
      options,
    });

    if (!nhostConfig.isAuthEnabled) {
      const error = new Error(nhostConfig.authDisabledMessage ?? 'Sign-in is not connected in this environment yet.');
      debugAuthError('signUp.disabled', error, {
        authUrl: getAuthUrl(),
        options,
      });
      throw error;
    }

    try {
      const response = await signUpEmailPassword(email, password, options);
      debugAuth('signUp.response', response);

      if (response.error) {
        debugAuthError('signUp.response.error', response.error, { response, options });
        throw response.error;
      }

      return response;
    } catch (error) {
      debugAuthError('signUp.throw', error, {
        email,
        authUrl: getAuthUrl(),
        options,
      });
      throw error;
    }
  };

  const signOutWithDebug = async () => {
    debugAuth('signOut.request', {
      authUrl: getAuthUrl(),
    });

    try {
      const response = await signOut();
      debugAuth('signOut.response', response);
      return response;
    } catch (error) {
      debugAuthError('signOut.throw', error, {
        authUrl: getAuthUrl(),
      });
      throw error;
    }
  };

  const authState: AuthState = !nhostConfig.isConfigured
    ? 'unconfigured'
    : authLoading
      ? 'loading'
      : isAuthenticated
        ? 'signed in'
        : 'signed out';

  const betaAccessState: BetaAccessState =
    loading
      ? 'loading'
      : isAuthenticated && nhostConfig.isAuthEnabled
        ? 'signed_in'
        : devRunnerActive
          ? 'dev_runner'
          : nhostConfig.isAuthEnabled
            ? 'signed_out'
            : 'auth_unavailable';

  useEffect(() => {
    debugAuth('status.change', {
      authState,
      betaAccessState,
      isAuthenticated,
      loading,
      signInLoading,
      signUpLoading,
      isAuthEnabled: nhostConfig.isAuthEnabled,
      authUrl: getAuthUrl(),
    });
  }, [authState, betaAccessState, isAuthenticated, loading, signInLoading, signUpLoading]);

  return {
    isAuthenticated: nhostConfig.isAuthEnabled ? isAuthenticated : false,
    hasBetaAccount: betaAccessState === 'signed_in',
    isConfigured: nhostConfig.isConfigured,
    isAvailable: nhostConfig.isAuthEnabled,
    disabledMessage: nhostConfig.authDisabledMessage,
    authState,
    betaAccessState,
    devRunnerActive,
    loading,
    signIn,
    signUp,
    signOut: signOutWithDebug,
    signInError,
    signUpError,
  };
}

export function getAuthErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    const message = error.message;
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('network request failed') ||
      lowerMessage.includes('fetch failed') ||
      lowerMessage.includes('failed to fetch') ||
      lowerMessage.includes('cors') ||
      lowerMessage.includes('placeholder.auth.invalid') ||
      (lowerMessage.includes('.auth.') && lowerMessage.includes('.nhost.run'))
    ) {
      return 'Sign-in is not reachable right now. Try again in a moment or keep browsing in guest mode.';
    }

    if (lowerMessage.includes('invalid email or password') || lowerMessage.includes('invalid credentials')) {
      return 'Email or password did not match.';
    }

    if (lowerMessage.includes('email needs verification') || lowerMessage.includes('email-not-verified')) {
      return 'Check your inbox and verify your email before signing in.';
    }

    if (lowerMessage.includes('user already registered') || lowerMessage.includes('email-already-in-use')) {
      return 'An account already exists for this email.';
    }

    if (lowerMessage.includes('multi-factor') || lowerMessage.includes('mfa')) {
      return 'This beta does not support multi-factor sign-in yet.';
    }

    if (lowerMessage.includes('too many requests')) {
      return 'Too many attempts. Wait a moment and try again.';
    }
  }

  return 'We could not complete sign-in right now. Please try again.';
}
