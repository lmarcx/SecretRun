import { z } from 'zod';

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(10000),
  HASURA_GRAPHQL_URL: z.string().url(),
  HASURA_ADMIN_SECRET: z.string().min(1),
  NHOST_SUBDOMAIN: z.string().min(1).optional(),
  NHOST_REGION: z.string().min(1).optional(),
  NHOST_JWKS_URL: z.string().url().optional(),
  NHOST_JWT_PUBLIC_KEY: z.string().min(1).optional(),
  NHOST_JWT_ISSUER: z.string().min(1).optional(),
  NHOST_JWT_AUDIENCE: z.string().min(1).optional(),
  TEAM_EVENT_BONUS_POINTS: z.coerce.number().int().default(5),
});

const parsed = rawEnvSchema.parse(process.env);

const derivedJwksUrl =
  parsed.NHOST_SUBDOMAIN && parsed.NHOST_REGION
    ? `https://${parsed.NHOST_SUBDOMAIN}.auth.${parsed.NHOST_REGION}.nhost.run/v1/.well-known/jwks.json`
    : undefined;

const jwksUrl = parsed.NHOST_JWKS_URL ?? derivedJwksUrl;

if (!jwksUrl && !parsed.NHOST_JWT_PUBLIC_KEY) {
  throw new Error(
    'Set NHOST_JWKS_URL or NHOST_JWT_PUBLIC_KEY. NHOST_SUBDOMAIN + NHOST_REGION can derive NHOST_JWKS_URL automatically.',
  );
}

export const env = {
  ...parsed,
  NHOST_JWKS_URL: jwksUrl,
};
