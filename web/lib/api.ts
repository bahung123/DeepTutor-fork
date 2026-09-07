/**
 * @deprecated Import from `@/shared/api/client`. This compatibility export is
 * removed after the feature-client migration in frontend plan Task 24.
 */
export function apiUrl(path: string): string {
  return path;
}

/**
 * Construct a WebSocket URL from a path.
 *
 * Client-side: returns the funnel WS URL directly — Vercel's edge proxy
 * cannot upgrade WebSocket connections (NextResponse.rewrite is HTTP-only),
 * so browsers connect straight to the Tailscale tunnel. WebSocket handshakes
 * are not CORS-gated, so the origin gap is fine. Server-side (SSR), there is
 * no `window`, so the path is returned unchanged (proxy.ts rewrites /ws/*).
 *
 * @param path - WebSocket path (e.g., '/api/v1/solve')
 * @returns WebSocket URL for the browser, path for SSR
 */
export function wsUrl(path: string): string {
  if (typeof window !== "undefined") {
    const base =
      process.env.NEXT_PUBLIC_WS_URL ||
      "wss://receivers-newspapers-deck-automobiles.trycloudflare.com";
    return `${base}${path}`;
  }
  return path;
}

/**
 * Parse a "DEEPTUTOR_AUTH_ENABLED"-style flag at runtime.
 *
 * Used by both `apiFetch` (frontend) and `web/proxy.ts` (auth redirect) to
 * decide whether to gate requests. Evaluated with a runtime regex so the
 * value can be set by the container entrypoint on every start (no build-time
 * inlining).
 */
export function parseAuthEnabled(raw: string | undefined): boolean {
  return /^(1|true|yes|on)$/i.test((raw ?? "").trim());
}

// Whether auth is enabled, learned at runtime — NOT from a build-time env var.
// The browser bundle never sees `DEEPTUTOR_AUTH_ENABLED` (it isn't a
// `NEXT_PUBLIC_` var, so Next.js does not inline it), and auth is a runtime
// setting that must not be baked at build time anyway. `fetchAuthStatus()` in
// `web/lib/auth.ts` calls `setRuntimeAuthEnabled()` once the backend reports the
// real state. Until then it defaults to `false`, so a stray 401 in the default
// auth-disabled deployment never bounces the user to /login. The server-side
// gate (web/proxy.ts middleware) enforces auth independently; this flag only
// drives the client's in-session 401 → /login redirect.
let runtimeAuthEnabled = false;

/** Record the backend-reported auth state for `apiFetch`'s 401 redirect gate. */
export function setRuntimeAuthEnabled(enabled: boolean): void {
  runtimeAuthEnabled = enabled;
}

/**
 * Authenticated fetch wrapper. Behaves identically to `fetch` but automatically
 * redirects to /login when the backend returns 401 (expired / invalid token).
 *
 * Pass `skipAuthRedirect: true` for endpoints where a 401 is an expected,
 * recoverable response that the caller wants to handle inline — most notably
 * the login/register endpoints, where 401 means "wrong credentials" and must
 * surface as a form error rather than reload the page.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit & { skipAuthRedirect?: boolean },
): Promise<Response> {
  const { skipAuthRedirect, ...fetchInit } = init ?? {};
  const res = await fetch(input, { credentials: "include", ...fetchInit });

  if (
    res.status === 401 &&
    runtimeAuthEnabled &&
    !skipAuthRedirect &&
    typeof window !== "undefined"
  ) {
    const next = encodeURIComponent(window.location.pathname);
    window.location.href = `/login?next=${next}`;
    return new Promise(() => {});
  }

  return res;
}
