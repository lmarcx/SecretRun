export function resolveAuthRedirectTarget(
  redirectTo: string | string[] | undefined,
  fallback: string,
): string {
  const resolved = Array.isArray(redirectTo) ? redirectTo[0] : redirectTo;

  if (!resolved || !resolved.startsWith('/')) {
    return fallback;
  }

  if (resolved === '/login' || resolved === '/register') {
    return fallback;
  }

  return resolved;
}
