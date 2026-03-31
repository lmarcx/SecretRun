import { nhost } from './nhostClient';

const configuredBackendApiUrl = process.env.EXPO_PUBLIC_BACKEND_API_URL?.trim().replace(/\/+$/, '') ?? '';

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
    throw new Error('Set EXPO_PUBLIC_BACKEND_API_URL to enable the standalone backend API.');
  }

  return configuredBackendApiUrl;
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
