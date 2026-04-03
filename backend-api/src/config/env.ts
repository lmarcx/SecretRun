import { z } from 'zod';

function emptyStringToUndefined(value: unknown) {
  return typeof value === 'string' && value.trim() === '' ? undefined : value;
}

const optionalString = z.preprocess(emptyStringToUndefined, z.string().min(1).optional());
const optionalUrl = z.preprocess(emptyStringToUndefined, z.string().url().optional());

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(10000),
  CORS_ALLOWED_ORIGINS: z.preprocess(emptyStringToUndefined, z.string().optional()),
  HASURA_GRAPHQL_URL: z.string().url(),
  HASURA_ADMIN_SECRET: z.string().min(1),
  NHOST_SUBDOMAIN: optionalString,
  NHOST_REGION: optionalString,
  NHOST_JWKS_URL: optionalUrl,
  NHOST_JWT_PUBLIC_KEY: optionalString,
  NHOST_JWT_ISSUER: optionalString,
  NHOST_JWT_AUDIENCE: optionalString,
  BETA_ALLOWED_EMAILS: z.preprocess(emptyStringToUndefined, z.string().optional()),
  TEAM_EVENT_BONUS_POINTS: z.coerce.number().int().default(5),
});

const parsed = rawEnvSchema.parse(process.env);

const derivedJwksUrl =
  parsed.NHOST_SUBDOMAIN && parsed.NHOST_REGION
    ? `https://${parsed.NHOST_SUBDOMAIN}.auth.${parsed.NHOST_REGION}.nhost.run/v1/.well-known/jwks.json`
    : undefined;

const jwksUrl = parsed.NHOST_JWKS_URL ?? derivedJwksUrl;
const authJwtConfigured = Boolean(jwksUrl || parsed.NHOST_JWT_PUBLIC_KEY);

if (parsed.NODE_ENV === 'production' && !authJwtConfigured) {
  throw new Error(
    'Set NHOST_JWKS_URL or NHOST_JWT_PUBLIC_KEY. NHOST_SUBDOMAIN + NHOST_REGION can derive NHOST_JWKS_URL automatically.',
  );
}

export const env = {
  ...parsed,
  NHOST_JWKS_URL: jwksUrl,
  AUTH_JWT_CONFIGURED: authJwtConfigured,
};
