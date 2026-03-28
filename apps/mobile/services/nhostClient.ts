import { NhostClient } from '@nhost/react';
import { debugAuth } from './authDebug';

type NhostService = 'auth' | 'functions' | 'graphql' | 'storage';

const normalizeEnvValue = (value: string | undefined): string | undefined => {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
};

const normalizeUrl = (url: string | undefined): string | undefined => normalizeEnvValue(url)?.replace(/\/+$/, '');

const subdomain = normalizeEnvValue(process.env.EXPO_PUBLIC_NHOST_SUBDOMAIN);
const region = normalizeEnvValue(process.env.EXPO_PUBLIC_NHOST_REGION);
const configuredGraphqlUrl = normalizeUrl(process.env.EXPO_PUBLIC_HASURA_GRAPHQL_URL);

const buildCloudServiceBaseUrl = (service: NhostService): string | undefined => {
  if (!subdomain || !region) {
    return undefined;
  }

  return `https://${subdomain}.${service}.${region}.nhost.run`;
};

const buildCloudServiceUrl = (service: NhostService): string | undefined => {
  const serviceBaseUrl = buildCloudServiceBaseUrl(service);
  return serviceBaseUrl ? `${serviceBaseUrl}/v1` : undefined;
};

const derivedAuthUrl = buildCloudServiceUrl('auth');
const derivedFunctionsUrl = buildCloudServiceUrl('functions');
const derivedStorageUrl = buildCloudServiceUrl('storage');
const derivedGraphqlUrl = buildCloudServiceUrl('graphql')
  ? `${buildCloudServiceUrl('graphql')}/graphql`
  : undefined;

const placeholderAuthUrl = 'https://placeholder.auth.invalid/v1';
const placeholderFunctionsUrl = 'https://placeholder.functions.invalid/v1';
const placeholderStorageUrl = 'https://placeholder.storage.invalid/v1';
const placeholderGraphqlUrl = 'https://placeholder.graphql.invalid/v1/graphql';

const missingEnvironmentVariables = [
  !subdomain ? 'EXPO_PUBLIC_NHOST_SUBDOMAIN' : null,
  !region ? 'EXPO_PUBLIC_NHOST_REGION' : null,
  !configuredGraphqlUrl ? 'EXPO_PUBLIC_HASURA_GRAPHQL_URL' : null,
].filter((value): value is string => Boolean(value));

export const nhostConfig = {
  isConfigured: Boolean(derivedAuthUrl),
  subdomain: subdomain ?? null,
  region,
  authUrl: derivedAuthUrl ?? placeholderAuthUrl,
  functionsUrl: derivedFunctionsUrl ?? placeholderFunctionsUrl,
  storageUrl: derivedStorageUrl ?? placeholderStorageUrl,
  graphqlUrl: configuredGraphqlUrl ?? derivedGraphqlUrl ?? placeholderGraphqlUrl,
  isAuthEnabled: Boolean(derivedAuthUrl),
  authDisabledMessage: derivedAuthUrl
    ? null
    : `Set ${missingEnvironmentVariables.join(', ')} to enable the Nhost Cloud project in mobile.`,
};

export const getGraphqlUrl = (): string => nhostConfig.graphqlUrl;
export const getAuthUrl = (): string => nhostConfig.authUrl;
export const getFunctionsBaseUrl = (): string => nhostConfig.functionsUrl;

const createNhostClient = () =>
  new NhostClient({
    authUrl: nhostConfig.authUrl,
    functionsUrl: nhostConfig.functionsUrl,
    graphqlUrl: nhostConfig.graphqlUrl,
    storageUrl: nhostConfig.storageUrl,
    ...(subdomain ? { subdomain } : {}),
    ...(region ? { region } : {}),
  });

export const nhost = createNhostClient();

debugAuth('nhost.config', {
  subdomain,
  region,
  configuredGraphqlUrl,
  derivedAuthUrl,
  derivedFunctionsUrl,
  derivedStorageUrl,
  derivedGraphqlUrl,
  authUrl: getAuthUrl(),
  functionsUrl: getFunctionsBaseUrl(),
  graphqlUrl: getGraphqlUrl(),
  storageUrl: nhostConfig.storageUrl,
  isConfigured: nhostConfig.isConfigured,
  isAuthEnabled: nhostConfig.isAuthEnabled,
  authDisabledMessage: nhostConfig.authDisabledMessage,
  missingEnvironmentVariables,
});
