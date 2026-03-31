import { useAuthenticationStatus, useSignInEmailPassword, useSignOut, useSignUpEmailPassword } from '@nhost/react';
import { useEffect, useState } from 'react';
import { debugAuth, debugAuthError } from '@/services/authDebug';
import {
  assertInviteCode,
  BetaAccessDeniedError,
  clearBetaAccessNotice,
  ensureCurrentBetaAccess,
  getBetaAccessMessage,
  getBetaAccessNotice,
  InviteCodeError,
  isInviteCodeRequired,
  resetBetaAccessCache,
  setBetaAccessNotice,
  subscribeBetaAccessNotice,
} from '@/services/betaAccessService';
import { isDevRunnerActive } from '@/services/devRunnerMode';
import { getAuthUrl, nhost, nhostConfig } from '@/services/nhostClient';

export type AuthState = 'unconfigured' | 'loading' | 'signed in' | 'signed out';
export type BetaAccessState = 'loading' | 'signed_in' | 'signed_out' | 'beta_blocked' | 'dev_runner' | 'auth_unavailable';

type BetaCheckState = 'idle' | 'checking' | 'allowed' | 'blocked';

export function useAuth() {
  const { isAuthenticated, isLoading: authLoading } = useAuthenticationStatus();
  const { signInEmailPassword, isLoading: signInLoading, error: signInError } = useSignInEmailPassword();
  const { signUpEmailPassword, isLoading: signUpLoading, error: signUpError } = useSignUpEmailPassword();
  const { signOut } = useSignOut();
  const devRunnerActive = isDevRunnerActive();
  const [betaCheckState, setBetaCheckState] = useState<BetaCheckState>('idle');
  const [betaAccessMessage, setBetaAccessMessage] = useState<string | null>(getBetaAccessNotice());
  const currentUser = nhost.auth.getUser();
  const userId = currentUser?.id ?? null;
  const inviteCodeRequired = isInviteCodeRequired();

  useEffect(() => subscribeBetaAccessNotice(setBetaAccessMessage), []);

  const loading = authLoading || signInLoading || signUpLoading || (isAuthenticated && nhostConfig.isAuthEnabled && betaCheckState === 'checking');

  const performSignOut = async () => {
    resetBetaAccessCache();
    const response = await signOut();
    return response;
  };

  const verifyClosedBetaAccess = async () => {
    setBetaCheckState('checking');
    resetBetaAccessCache();

    try {
      await ensureCurrentBetaAccess();
      clearBetaAccessNotice();
      setBetaCheckState('allowed');
    } catch (error) {
      const message = getBetaAccessMessage(error);
      setBetaAccessNotice(message);
      setBetaCheckState('blocked');

      try {
        await performSignOut();
      } catch (signOutError) {
        debugAuthError('betaAccess.signOutAfterFailure', signOutError);
      }

      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    clearBetaAccessNotice();
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

      if (!response.needsEmailVerification && !response.needsMfaOtp) {
        await verifyClosedBetaAccess();
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
    inviteCode?: string,
  ) => {
    clearBetaAccessNotice();
    debugAuth('signUp.request', {
      email,
      authUrl: getAuthUrl(),
      isAuthEnabled: nhostConfig.isAuthEnabled,
      options,
      inviteCodeRequired,
    });

    if (!nhostConfig.isAuthEnabled) {
      const error = new Error(nhostConfig.authDisabledMessage ?? 'Sign-in is not connected in this environment yet.');
      debugAuthError('signUp.disabled', error, {
        authUrl: getAuthUrl(),
        options,
      });
      throw error;
    }

    assertInviteCode(inviteCode ?? '');

    try {
      const response = await signUpEmailPassword(email, password, options);
      debugAuth('signUp.response', response);

      if (response.error) {
        debugAuthError('signUp.response.error', response.error, { response, options });
        throw response.error;
      }

      if (!response.needsEmailVerification) {
        await verifyClosedBetaAccess();
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

    clearBetaAccessNotice();
    setBetaCheckState('idle');

    try {
      const response = await performSignOut();
      debugAuth('signOut.response', response);
      return response;
    } catch (error) {
      debugAuthError('signOut.throw', error, {
        authUrl: getAuthUrl(),
      });
      throw error;
    }
  };

  useEffect(() => {
    let active = true;

    if (!nhostConfig.isAuthEnabled || !isAuthenticated || !userId) {
      setBetaCheckState((value) => (value === 'blocked' ? value : 'idle'));
      return () => {
        active = false;
      };
    }

    if (betaCheckState === 'allowed') {
      return () => {
        active = false;
      };
    }

    const check = async () => {
      try {
        await verifyClosedBetaAccess();
      } catch (error) {
        if (!active) {
          return;
        }

        if (!(error instanceof BetaAccessDeniedError) && !(error instanceof InviteCodeError)) {
          debugAuthError('betaAccess.effect', error, {
            userId,
          });
        }
      }
    };

    void check();

    return () => {
      active = false;
    };
  }, [betaCheckState, isAuthenticated, userId]);

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
      : betaCheckState === 'blocked'
        ? 'beta_blocked'
        : isAuthenticated && nhostConfig.isAuthEnabled && betaCheckState === 'allowed'
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
      betaCheckState,
      isAuthEnabled: nhostConfig.isAuthEnabled,
      authUrl: getAuthUrl(),
    });
  }, [authState, betaAccessState, betaCheckState, isAuthenticated, loading, signInLoading, signUpLoading]);

  return {
    isAuthenticated: nhostConfig.isAuthEnabled ? betaAccessState === 'signed_in' : false,
    hasBetaAccount: betaAccessState === 'signed_in',
    isConfigured: nhostConfig.isConfigured,
    isAvailable: nhostConfig.isAuthEnabled,
    disabledMessage: nhostConfig.authDisabledMessage,
    authState,
    betaAccessState,
    betaAccessMessage,
    inviteCodeRequired,
    devRunnerActive,
    loading,
    signIn,
    signUp,
    signOut: signOutWithDebug,
    clearBetaAccessMessage: clearBetaAccessNotice,
    signInError,
    signUpError,
  };
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof InviteCodeError || error instanceof BetaAccessDeniedError) {
    return error.message;
  }

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
      return 'Sign-in is not reachable right now. Try again in a moment.';
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

    if (lowerMessage.includes('does not have closed beta access')) {
      return 'This email does not have closed beta access yet.';
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
