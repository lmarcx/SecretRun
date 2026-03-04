import { useAuthenticationStatus, useSignInEmailPassword, useSignOut, useSignUpEmailPassword } from '@nhost/react';

export function useAuth() {
  const { isAuthenticated, isLoading: authLoading } = useAuthenticationStatus();
  const { signInEmailPassword, isLoading: signInLoading, error: signInError } = useSignInEmailPassword();
  const { signUpEmailPassword, isLoading: signUpLoading, error: signUpError } = useSignUpEmailPassword();
  const { signOut } = useSignOut();

  const signIn = async (email: string, password: string) => {
    const response = await signInEmailPassword(email, password);
    if (response.error) {
      throw response.error;
    }
    return response;
  };

  const signUp = async (email: string, password: string) => {
    const response = await signUpEmailPassword(email, password);
    if (response.error) {
      throw response.error;
    }
    return response;
  };

  return {
    isAuthenticated,
    loading: authLoading || signInLoading || signUpLoading,
    signIn,
    signUp,
    signOut,
    signInError,
    signUpError,
  };
}
