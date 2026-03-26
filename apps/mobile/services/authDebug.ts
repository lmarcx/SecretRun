function normalizeAuthDebugValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      cause:
        typeof value.cause === 'object' && value.cause !== null ? normalizeAuthDebugValue(value.cause) : value.cause,
    };
  }

  if (Array.isArray(value)) {
    return value.map(normalizeAuthDebugValue);
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, normalizeAuthDebugValue(entry)]));
  }

  return value;
}

export function debugAuth(event: string, payload?: unknown) {
  if (!__DEV__) {
    return;
  }

  if (payload === undefined) {
    console.log(`[auth] ${event}`);
    return;
  }

  console.log(`[auth] ${event}`, normalizeAuthDebugValue(payload));
}

export function debugAuthError(event: string, error: unknown, context?: Record<string, unknown>) {
  if (!__DEV__) {
    return;
  }

  console.error(`[auth] ${event}`, {
    ...(context ?? {}),
    error: normalizeAuthDebugValue(error),
  });
}
