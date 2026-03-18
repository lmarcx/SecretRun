import { NhostClient } from '@nhost/react';

const subdomain = process.env.EXPO_PUBLIC_NHOST_SUBDOMAIN;
const region = process.env.EXPO_PUBLIC_NHOST_REGION;
const configuredBaseUrl = process.env.EXPO_PUBLIC_NHOST_BASE_URL;
const configuredGraphqlUrl = process.env.EXPO_PUBLIC_HASURA_GRAPHQL_URL;
const fallbackSubdomain = 'local';

const normalizeBaseUrl = (url: string): string => url.replace(/\/+$/, '');

const deriveBaseUrlFromSubdomainRegion = (valueSubdomain: string, valueRegion?: string): string => {
  if (valueSubdomain === fallbackSubdomain && !valueRegion) {
    return 'http://localhost:1337';
  }

  if (valueSubdomain === fallbackSubdomain && valueRegion === fallbackSubdomain) {
    return 'http://localhost:1337';
  }

  if (!valueRegion) {
    throw new Error(`Missing Nhost region for subdomain "${valueSubdomain}".`);
  }

  return `https://${valueSubdomain}.${valueRegion}.nhost.run`;
};

const derivedBaseUrl =
  configuredBaseUrl && configuredBaseUrl.length > 0
    ? normalizeBaseUrl(configuredBaseUrl)
    : subdomain
      ? deriveBaseUrlFromSubdomainRegion(subdomain, region)
      : undefined;

const isLocalPlaceholderAuthConfig =
  (subdomain === fallbackSubdomain || !subdomain) && (!region || region === fallbackSubdomain);

export const nhostConfig = {
  isConfigured: Boolean(derivedBaseUrl),
  baseUrl: derivedBaseUrl ?? 'http://localhost:1337',
  subdomain: subdomain ?? fallbackSubdomain,
  region,
  isAuthEnabled: Boolean(derivedBaseUrl) && !isLocalPlaceholderAuthConfig,
  authDisabledMessage: !derivedBaseUrl
    ? 'Sign-in is not connected in this environment yet.'
    : isLocalPlaceholderAuthConfig
      ? 'Sign-in is not connected in this local environment yet. You can keep browsing in guest mode.'
      : null,
};

export const getGraphqlUrl = (): string =>
  configuredGraphqlUrl && configuredGraphqlUrl.length > 0
    ? configuredGraphqlUrl
    : `${nhostConfig.baseUrl}/v1/graphql`;

export const getFunctionsBaseUrl = (): string => `${nhostConfig.baseUrl}/v1/functions`;

const createNhostClient = () => {
  if (nhostConfig.isConfigured && subdomain) {
    if (region) {
      return new NhostClient({
        subdomain,
        region,
      });
    }

    return new NhostClient({
      authUrl: `${nhostConfig.baseUrl}/v1/auth`,
      functionsUrl: `${nhostConfig.baseUrl}/v1/functions`,
      graphqlUrl: getGraphqlUrl(),
      storageUrl: `${nhostConfig.baseUrl}/v1/storage`,
    });
  }

  return new NhostClient({
    subdomain: fallbackSubdomain,
  });
};

export const nhost = createNhostClient();
