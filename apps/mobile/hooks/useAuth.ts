import { useAuthenticationStatus, useSignInEmailPassword, useSignOut, useSignUpEmailPassword } from '@nhost/react';
import { nhostConfig } from '@/services/nhostClient';

export type AuthState = 'unconfigured' | 'loading' | 'signed in' | 'signed out';

export function useAuth() {
  const { isAuthenticated, isLoading: authLoading } = useAuthenticationStatus();
  const { signInEmailPassword, isLoading: signInLoading, error: signInError } = useSignInEmailPassword();
  const { signUpEmailPassword, isLoading: signUpLoading, error: signUpError } = useSignUpEmailPassword();
  const { signOut } = useSignOut();

  const signIn = async (email: string, password: string) => {
    if (!nhostConfig.isAuthEnabled) {
      throw new Error(nhostConfig.authDisabledMessage ?? 'Local auth is not available in this environment yet.');
    }

    const response = await signInEmailPassword(email, password);
    if (response.error) {
      throw response.error;
    }
    return response;
  };

  const signUp = async (email: string, password: string) => {
    if (!nhostConfig.isAuthEnabled) {
      throw new Error(nhostConfig.authDisabledMessage ?? 'Local auth is not available in this environment yet.');
    }

    const response = await signUpEmailPassword(email, password);
    if (response.error) {
      throw response.error;
    }
    return response;
  };

  const authState: AuthState = !nhostConfig.isConfigured
    ? 'unconfigured'
    : authLoading
      ? 'loading'
      : isAuthenticated
        ? 'signed in'
        : 'signed out';

  return {
    isAuthenticated: nhostConfig.isAuthEnabled ? isAuthenticated : false,
    isConfigured: nhostConfig.isConfigured,
    isAvailable: nhostConfig.isAuthEnabled,
    disabledMessage: nhostConfig.authDisabledMessage,
    authState,
    loading: authLoading || signInLoading || signUpLoading,
    signIn,
    signUp,
    signOut,
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
      lowerMessage.includes('local.auth.local.nhost.run')
    ) {
      return 'Local auth is not available in this environment yet. Use signed-out mode for now.';
    }

    if (lowerMessage.includes('invalid email or password') || lowerMessage.includes('invalid credentials')) {
      return 'Invalid email or password.';
    }

    return message;
  }

  return 'Authentication failed. Please try again.';
}
