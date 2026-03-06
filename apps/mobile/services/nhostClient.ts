import { NhostClient } from '@nhost/react';

const subdomain = process.env.EXPO_PUBLIC_NHOST_SUBDOMAIN;
const region = process.env.EXPO_PUBLIC_NHOST_REGION;
const configuredBaseUrl = process.env.EXPO_PUBLIC_NHOST_BASE_URL;
const configuredGraphqlUrl = process.env.EXPO_PUBLIC_HASURA_GRAPHQL_URL;

const normalizeBaseUrl = (url: string): string => url.replace(/\/+$/, '');

const deriveBaseUrlFromSubdomainRegion = (valueSubdomain: string, valueRegion: string): string => {
  if (valueSubdomain === 'local' && valueRegion === 'local') {
    return 'http://localhost:1337';
  }

  return `https://${valueSubdomain}.${valueRegion}.nhost.run`;
};

const derivedBaseUrl =
  configuredBaseUrl && configuredBaseUrl.length > 0
    ? normalizeBaseUrl(configuredBaseUrl)
    : subdomain && region
      ? deriveBaseUrlFromSubdomainRegion(subdomain, region)
      : undefined;

if (!derivedBaseUrl) {
  throw new Error(
    'Missing Nhost configuration. Set EXPO_PUBLIC_NHOST_SUBDOMAIN + EXPO_PUBLIC_NHOST_REGION or EXPO_PUBLIC_NHOST_BASE_URL.',
  );
}

export const getGraphqlUrl = (): string =>
  configuredGraphqlUrl && configuredGraphqlUrl.length > 0
    ? configuredGraphqlUrl
    : `${derivedBaseUrl}/v1/graphql`;

export const nhost =
  subdomain && region
    ? new NhostClient({
        subdomain,
        region,
      })
    : new NhostClient({
        backendUrl: derivedBaseUrl,
      });
