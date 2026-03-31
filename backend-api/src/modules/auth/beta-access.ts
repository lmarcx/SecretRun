import type { AuthContext } from './jwt';
import { env } from '../../config/env';
import { AppError } from '../../lib/errors';

export type BetaAccessMode = 'open' | 'email_allowlist';
export type BetaAccessReason = 'open' | 'email_allowlist_match' | 'email_not_allowlisted' | 'missing_email';

export interface BetaAccessResult {
  allowed: boolean;
  mode: BetaAccessMode;
  email: string | null;
  reason: BetaAccessReason;
  message: string | null;
}

const allowedEmails = (env.BETA_ALLOWED_EMAILS ?? '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

export function isBetaAccessEnforced(): boolean {
  return allowedEmails.length > 0;
}

export function getBetaAccess(auth: Pick<AuthContext, 'payload'>): BetaAccessResult {
  const email = typeof auth.payload.email === 'string' ? auth.payload.email.trim().toLowerCase() : null;

  if (!isBetaAccessEnforced()) {
    return {
      allowed: true,
      mode: 'open',
      email,
      reason: 'open',
      message: null,
    };
  }

  if (!email) {
    return {
      allowed: false,
      mode: 'email_allowlist',
      email: null,
      reason: 'missing_email',
      message: 'This beta account is missing an email address.',
    };
  }

  if (allowedEmails.includes(email)) {
    return {
      allowed: true,
      mode: 'email_allowlist',
      email,
      reason: 'email_allowlist_match',
      message: null,
    };
  }

  return {
    allowed: false,
    mode: 'email_allowlist',
    email,
    reason: 'email_not_allowlisted',
    message: 'This email does not have closed beta access yet.',
  };
}

export function assertBetaAccess(auth: Pick<AuthContext, 'payload'>) {
  const access = getBetaAccess(auth);
  if (access.allowed) {
    return access;
  }

  throw new AppError(403, 'beta_access_denied', access.message ?? 'Closed beta access denied.', {
    mode: access.mode,
    reason: access.reason,
    email: access.email,
  });
}
