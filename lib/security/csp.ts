/**
 * Per-request Content-Security-Policy (H2, plan-refuerzo-2026-11-20).
 *
 * The policy is generated in proxy.ts with a fresh nonce for every HTML
 * request. Next.js reads the `Content-Security-Policy` request header during
 * SSR, extracts `'nonce-…'` and stamps it on its own framework/runtime
 * scripts; our own `<Script>` tags read `x-nonce` via `headers()`.
 *
 * `'strict-dynamic'` lets nonce-trusted scripts load further scripts (chunks,
 * Vercel Analytics / Speed Insights injected from /_vercel/*, Sentry lazy
 * bundles) while host allowlists in script-src are ignored by CSP3 browsers.
 *
 * style-src keeps 'unsafe-inline' on purpose: Tailwind/Next/framer-motion emit
 * inline `style` attributes, which nonces cannot cover. Style injection is a
 * much weaker vector than script injection.
 */

export const NONCE_HEADER = "x-nonce";

export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function buildContentSecurityPolicy(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    // 'unsafe-eval' only in dev: React uses eval to rebuild server error stacks.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "media-src 'self' blob: https:",
    // Sentry ingest, Upstash (server-side only), Vercel insights are https.
    `connect-src 'self' https:${isDev ? " http: ws: wss:" : ""}`,
    // Google Maps embed — hosts mirror isSafeMapEmbedUrl in homepage-adapter.
    "frame-src 'self' https://www.google.com https://google.com https://maps.google.com",
    // Explicit so 'strict-dynamic' in script-src never blocks /sw.js.
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    // No upgrade-insecure-requests: HSTS already covers prod, and it would
    // break `next start` over plain http://localhost (e2e against a prod build).
  ].join("; ");
}
