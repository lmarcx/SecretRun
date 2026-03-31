const eventsDebugEnabled = typeof __DEV__ !== 'undefined' && __DEV__;

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalize);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, normalize(entry)]),
  );
}

export function debugEvents(event: string, payload?: unknown) {
  if (!eventsDebugEnabled) {
    return;
  }

  if (payload === undefined) {
    console.log(`[events] ${event}`);
    return;
  }

  console.log(`[events] ${event}`, normalize(payload));
}
