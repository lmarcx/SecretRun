import { NhostClient } from '@nhost/react';
import { debugAuth } from './authDebug';

type NhostService = 'auth' | 'functions' | 'graphql' | 'storage';
type SourceMode = 'local' | 'cloud' | 'custom' | 'unset';

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

const missingAuthEnvironmentVariables = [
  !subdomain ? 'EXPO_PUBLIC_NHOST_SUBDOMAIN' : null,
  !region ? 'EXPO_PUBLIC_NHOST_REGION' : null,
].filter((value): value is string => Boolean(value));

const isAuthEnabled = Boolean(derivedAuthUrl);
const isGraphqlEnabled = Boolean(configuredGraphqlUrl ?? derivedGraphqlUrl);
const isFunctionsEnabled = Boolean(derivedFunctionsUrl);
const authDisabledMessage = isAuthEnabled
  ? null
  : `Set ${missingAuthEnvironmentVariables.join(', ')} to enable Nhost Auth in mobile.`;
const graphqlDisabledMessage = isGraphqlEnabled
  ? null
  : 'Set EXPO_PUBLIC_HASURA_GRAPHQL_URL or EXPO_PUBLIC_NHOST_SUBDOMAIN + EXPO_PUBLIC_NHOST_REGION to load public GraphQL data in mobile.';

export const nhostConfig = {
  isConfigured: isAuthEnabled,
  subdomain: subdomain ?? null,
  region,
  authUrl: derivedAuthUrl ?? placeholderAuthUrl,
  functionsUrl: derivedFunctionsUrl ?? placeholderFunctionsUrl,
  storageUrl: derivedStorageUrl ?? placeholderStorageUrl,
  graphqlUrl: configuredGraphqlUrl ?? derivedGraphqlUrl ?? placeholderGraphqlUrl,
  isAuthEnabled,
  isGraphqlEnabled,
  isFunctionsEnabled,
  authDisabledMessage,
  graphqlDisabledMessage,
};

export function getAuthSourceDiagnostics(): { url: string | null; mode: SourceMode } {
  return {
    url: derivedAuthUrl ?? null,
    mode: classifySourceMode(derivedAuthUrl),
  };
}

export function getGraphqlSourceDiagnostics(): { url: string | null; mode: SourceMode; via: 'explicit' | 'derived' | 'unset' } {
  return {
    url: configuredGraphqlUrl ?? derivedGraphqlUrl ?? null,
    mode: classifySourceMode(configuredGraphqlUrl ?? derivedGraphqlUrl),
    via: configuredGraphqlUrl ? 'explicit' : derivedGraphqlUrl ? 'derived' : 'unset',
  };
}

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
  isGraphqlEnabled: nhostConfig.isGraphqlEnabled,
  isFunctionsEnabled: nhostConfig.isFunctionsEnabled,
  authDisabledMessage: nhostConfig.authDisabledMessage,
  graphqlDisabledMessage: nhostConfig.graphqlDisabledMessage,
  missingAuthEnvironmentVariables,
});

function classifySourceMode(url: string | null | undefined): SourceMode {
  if (!url) {
    return 'unset';
  }

  const normalized = url.toLowerCase();
  if (
    normalized.includes('localhost') ||
    normalized.includes('127.0.0.1') ||
    normalized.includes('192.168.') ||
    normalized.includes('10.') ||
    normalized.includes('172.16.') ||
    normalized.includes('172.17.') ||
    normalized.includes('172.18.') ||
    normalized.includes('172.19.') ||
    normalized.includes('.local')
  ) {
    return 'local';
  }

  if (normalized.includes('.nhost.run')) {
    return 'cloud';
  }

  return 'custom';
}
