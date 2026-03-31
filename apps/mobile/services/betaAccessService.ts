import { BackendApiError, requestBackendApi } from './backendApiClient';
import { nhost } from './nhostClient';

export interface BetaAccessPayload {
  allowed: boolean;
  mode: 'open' | 'email_allowlist';
  email: string | null;
  reason: 'open' | 'email_allowlist_match' | 'email_not_allowlisted' | 'missing_email';
  message: string | null;
}

interface MeResponse {
  betaAccess: BetaAccessPayload;
}

export class BetaAccessDeniedError extends Error {
  code = 'beta_access_denied' as const;
  reason: BetaAccessPayload['reason'];

  constructor(message: string, reason: BetaAccessPayload['reason']) {
    super(message);
    this.name = 'BetaAccessDeniedError';
    this.reason = reason;
  }
}

export class InviteCodeError extends Error {
  code = 'invalid_beta_invite' as const;

  constructor(message: string) {
    super(message);
    this.name = 'InviteCodeError';
  }
}

const configuredInviteCode = process.env.EXPO_PUBLIC_BETA_INVITE_CODE?.trim() ?? null;

let cachedUserId: string | null = null;
let cachedBetaAccess: BetaAccessPayload | null = null;
let inflightUserId: string | null = null;
let inflightPromise: Promise<BetaAccessPayload> | null = null;

let betaAccessNotice: string | null = null;
const betaAccessNoticeListeners = new Set<(message: string | null) => void>();

export function isInviteCodeRequired(): boolean {
  return Boolean(configuredInviteCode);
}

export function assertInviteCode(inviteCode: string) {
  if (!configuredInviteCode) {
    return;
  }

  if (inviteCode.trim() !== configuredInviteCode) {
    throw new InviteCodeError('This invitation code is invalid.');
  }
}

export async function fetchCurrentBetaAccess(): Promise<BetaAccessPayload> {
  const user = nhost.auth.getUser();
  const userId = user?.id ?? null;

  if (!userId) {
    throw new Error('A signed-in beta account is required to check access.');
  }

  if (cachedUserId === userId && cachedBetaAccess) {
    return cachedBetaAccess;
  }

  if (inflightUserId === userId && inflightPromise) {
    return inflightPromise;
  }

  inflightUserId = userId;
  inflightPromise = requestBackendApi<MeResponse>('/me')
    .then((response) => {
      cachedUserId = userId;
      cachedBetaAccess = response.betaAccess;
      return response.betaAccess;
    })
    .finally(() => {
      inflightPromise = null;
      inflightUserId = null;
    });

  return inflightPromise;
}

export async function ensureCurrentBetaAccess(): Promise<BetaAccessPayload> {
  const access = await fetchCurrentBetaAccess();
  if (access.allowed) {
    return access;
  }

  throw new BetaAccessDeniedError(access.message ?? 'Closed beta access denied.', access.reason);
}

export function resetBetaAccessCache() {
  cachedUserId = null;
  cachedBetaAccess = null;
  inflightUserId = null;
  inflightPromise = null;
}

export function getBetaAccessNotice(): string | null {
  return betaAccessNotice;
}

export function setBetaAccessNotice(message: string | null) {
  betaAccessNotice = message;
  for (const listener of betaAccessNoticeListeners) {
    listener(message);
  }
}

export function clearBetaAccessNotice() {
  setBetaAccessNotice(null);
}

export function subscribeBetaAccessNotice(listener: (message: string | null) => void) {
  betaAccessNoticeListeners.add(listener);
  return () => {
    betaAccessNoticeListeners.delete(listener);
  };
}

export function getBetaAccessMessage(error: unknown): string {
  if (error instanceof InviteCodeError || error instanceof BetaAccessDeniedError) {
    return error.message;
  }

  if (error instanceof BackendApiError) {
    if (error.code === 'beta_access_denied') {
      return error.message;
    }
  }

  if (error instanceof Error) {
    const lowerMessage = error.message.toLowerCase();
    if (
      lowerMessage.includes('network request failed') ||
      lowerMessage.includes('fetch failed') ||
      lowerMessage.includes('failed to fetch')
    ) {
      return 'We could not verify beta access right now.';
    }
  }

  return 'We could not verify beta access right now.';
}
