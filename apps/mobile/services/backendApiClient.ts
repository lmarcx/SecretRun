import { nhost } from './nhostClient';

const configuredBackendApiUrl = process.env.EXPO_PUBLIC_BACKEND_API_URL?.trim().replace(/\/+$/, '') ?? '';
export const BACKEND_API_CONFIG_ERROR_MESSAGE = 'Set EXPO_PUBLIC_BACKEND_API_URL to enable the standalone backend API.';

export interface BackendApiSourceDiagnostics {
  url: string | null;
  mode: 'local' | 'cloud' | 'custom' | 'unset';
}

export class BackendApiError extends Error {
  status: number;
  code: string;
  details: unknown;

  constructor(status: number, code: string, message: string, details: unknown = null) {
    super(message);
    this.name = 'BackendApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function getBackendApiBaseUrl(): string {
  if (!configuredBackendApiUrl) {
    throw new Error(BACKEND_API_CONFIG_ERROR_MESSAGE);
  }

  return configuredBackendApiUrl;
}

export function isBackendApiConfigured(): boolean {
  return Boolean(configuredBackendApiUrl);
}

export function isBackendApiConfigError(error: unknown): boolean {
  return error instanceof Error && error.message.includes(BACKEND_API_CONFIG_ERROR_MESSAGE);
}

export function getBackendApiSourceDiagnostics(): BackendApiSourceDiagnostics {
  return {
    url: configuredBackendApiUrl || null,
    mode: classifySourceMode(configuredBackendApiUrl),
  };
}

export async function requestBackendApi<TResponse>(
  path: string,
  init: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
  } = {},
): Promise<TResponse> {
  const accessToken = nhost.auth.getAccessToken();
  const response = await fetch(`${getBackendApiBaseUrl()}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });

  const payload = (await response.json().catch(() => null)) as
    | ({ error?: string; message?: string; details?: unknown } & TResponse)
    | null;

  if (!response.ok) {
    throw new BackendApiError(
      response.status,
      payload?.error ?? 'backend_api_error',
      payload?.message ?? `Backend API failed with status ${response.status}.`,
      payload?.details ?? null,
    );
  }

  return (payload ?? {}) as TResponse;
}

function classifySourceMode(url: string | null | undefined): BackendApiSourceDiagnostics['mode'] {
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

  if (normalized.includes('.onrender.com') || normalized.includes('.nhost.run')) {
    return 'cloud';
  }

  return 'custom';
}
