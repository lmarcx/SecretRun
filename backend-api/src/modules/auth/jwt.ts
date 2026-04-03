import type { JWTPayload } from 'jose';
import { env } from '../../config/env';
import { AppError } from '../../lib/errors';

type HasuraClaims = {
  'x-hasura-user-id'?: string;
  'x-hasura-default-role'?: string;
  'x-hasura-allowed-roles'?: string[];
};

export interface AuthContext {
  token: string;
  userId: string;
  payload: JWTPayload;
  hasuraClaims: HasuraClaims | null;
}

type JoseModule = typeof import('jose');
type ImportedKey = Awaited<ReturnType<JoseModule['importSPKI']>>;
type RemoteJwks = ReturnType<JoseModule['createRemoteJWKSet']>;
type Verifier = { kind: 'key'; value: ImportedKey } | { kind: 'jwks'; value: RemoteJwks };

let verifierPromise: Promise<Verifier> | null = null;
let joseModulePromise: Promise<JoseModule> | null = null;

export function isAuthConfigured(): boolean {
  return env.AUTH_JWT_CONFIGURED;
}

export function assertAuthConfigured() {
  if (isAuthConfigured()) {
    return;
  }

  throw new AppError(
    503,
    'auth_unavailable',
    env.NODE_ENV === 'development'
      ? 'Authentication backend not configured in development.'
      : 'Authentication backend not configured in this environment.',
    {
      nodeEnv: env.NODE_ENV,
      missing: ['NHOST_JWKS_URL or NHOST_JWT_PUBLIC_KEY'],
    },
  );
}

function normalizePem(value: string): string {
  return value.replace(/\\n/g, '\n');
}

function getHasuraClaims(payload: JWTPayload): HasuraClaims | null {
  const claims = payload['https://hasura.io/jwt/claims'];
  if (!claims || typeof claims !== 'object') {
    return null;
  }

  return claims as HasuraClaims;
}

async function getJose(): Promise<JoseModule> {
  if (!joseModulePromise) {
    joseModulePromise = import('jose');
  }

  return joseModulePromise;
}

async function getVerifier(): Promise<Verifier> {
  if (!verifierPromise) {
    verifierPromise = (async () => {
      const { createRemoteJWKSet, importSPKI } = await getJose();

      if (env.NHOST_JWT_PUBLIC_KEY) {
        return {
          kind: 'key',
          value: await importSPKI(normalizePem(env.NHOST_JWT_PUBLIC_KEY), 'RS256'),
        };
      }

      if (!env.NHOST_JWKS_URL) {
        throw new Error('Missing JWKS configuration.');
      }

      return {
        kind: 'jwks',
        value: createRemoteJWKSet(new URL(env.NHOST_JWKS_URL)),
      };
    })();
  }

  return verifierPromise;
}

export async function verifyAccessToken(token: string): Promise<AuthContext> {
  assertAuthConfigured();
  const verifier = await getVerifier();
  const { jwtVerify } = await getJose();
  const verifyOptions = {
    ...(env.NHOST_JWT_ISSUER ? { issuer: env.NHOST_JWT_ISSUER } : {}),
    ...(env.NHOST_JWT_AUDIENCE ? { audience: env.NHOST_JWT_AUDIENCE } : {}),
    algorithms: ['RS256', 'RS384', 'RS512'],
  };

  const { payload } =
    verifier.kind === 'key'
      ? await jwtVerify(token, verifier.value, verifyOptions)
      : await jwtVerify(token, verifier.value, verifyOptions);
  const hasuraClaims = getHasuraClaims(payload);
  const subjectUserId = typeof payload.sub === 'string' ? payload.sub : null;
  const claimsUserId = hasuraClaims?.['x-hasura-user-id'] ?? null;

  if (claimsUserId && subjectUserId && claimsUserId !== subjectUserId) {
    throw new AppError(401, 'invalid_token', 'JWT subject does not match Hasura claims.');
  }

  const userId = claimsUserId ?? subjectUserId;

  if (!userId) {
    throw new AppError(401, 'invalid_token', 'Token does not contain a user identifier.');
  }

  return {
    token,
    userId,
    payload,
    hasuraClaims,
  };
}
