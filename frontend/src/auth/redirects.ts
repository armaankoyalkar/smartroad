/** Helpers for the login redirect round trip (`/login?returnTo=...`). */

/** Build the login URL that brings the visitor back to `pathname + search` after signing in. */
export function loginRedirect(pathname: string, search = ""): string {
  const returnTo = `${pathname}${search}`;
  return `/login?returnTo=${encodeURIComponent(returnTo)}`;
}

/**
 * Sanitise a `returnTo` value from the URL: only same-origin absolute paths are accepted,
 * so a crafted link can never redirect to another site after login.
 */
export function safeReturnTo(value: string | null | undefined, fallback = "/app"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
