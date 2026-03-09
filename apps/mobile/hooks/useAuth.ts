import { useAuthenticationStatus, useSignInEmailPassword, useSignOut, useSignUpEmailPassword } from '@nhost/react';
import { nhostConfig } from '@/services/nhostClient';

export function useAuth() {
  const { isAuthenticated, isLoading: authLoading } = useAuthenticationStatus();
  const { signInEmailPassword, isLoading: signInLoading, error: signInError } = useSignInEmailPassword();
  const { signUpEmailPassword, isLoading: signUpLoading, error: signUpError } = useSignUpEmailPassword();
  const { signOut } = useSignOut();

  const signIn = async (email: string, password: string) => {
    if (!nhostConfig.isConfigured) {
      throw new Error('Auth is unavailable until the Nhost environment variables are configured.');
    }

    const response = await signInEmailPassword(email, password);
    if (response.error) {
      throw response.error;
    }
    return response;
  };

  const signUp = async (email: string, password: string) => {
    if (!nhostConfig.isConfigured) {
      throw new Error('Auth is unavailable until the Nhost environment variables are configured.');
    }

    const response = await signUpEmailPassword(email, password);
    if (response.error) {
      throw response.error;
    }
    return response;
  };

  const authState = !nhostConfig.isConfigured
    ? 'unconfigured'
    : authLoading
      ? 'loading'
      : isAuthenticated
        ? 'signed in'
        : 'signed out';

  return {
    isAuthenticated: nhostConfig.isConfigured ? isAuthenticated : false,
    isConfigured: nhostConfig.isConfigured,
    authState,
    loading: authLoading || signInLoading || signUpLoading,
    signIn,
    signUp,
    signOut,
    signInError,
    signUpError,
  };
}
