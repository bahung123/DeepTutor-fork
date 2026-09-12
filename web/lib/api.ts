/**
 * @deprecated Import from `@/shared/api/client`. This compatibility export is
 * removed after the feature-client migration in frontend plan Task 24.
 */
export * from "@/shared/api/client";
export * from "@/shared/api/errors";

// Override wsUrl: client-side connects straight to the Tailscale tunnel.
// Vercel's edge proxy cannot upgrade WebSocket connections
// (NextResponse.rewrite is HTTP-only), so browsers connect straight to
// the Tailscale funnel. WebSocket handshakes are not CORS-gated, so the
// origin gap is fine. Server-side (SSR), there is no `window`, so the
// path is returned unchanged (proxy.ts rewrites /ws/*).
import { wsUrl as _wsUrl } from "@/shared/api/client";
export function wsUrl(path: string): string {
  if (typeof window !== "undefined") {
    return `wss://tailscale-termux.tail2888c5.ts.net${path}`;
  }
  return _wsUrl(path);
}
