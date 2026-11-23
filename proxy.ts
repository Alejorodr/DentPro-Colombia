import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import {
  getInferredAuthBaseUrl,
  getRuntimeStage,
  getSessionCookieName,
  isLocalE2EAuthRuntime,
  isProductionRuntime,
} from "@/lib/auth/runtime";
import { getDefaultDashboardPath, isUserRole, roleFromSlug, type UserRole } from "@/lib/auth/roles";
import { errorResponse } from "@/app/api/_utils/response";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { NONCE_HEADER, buildContentSecurityPolicy, generateNonce } from "@/lib/security/csp";
import { getUpstashRestConfig } from "@/lib/security/upstash-config";

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 10;
let warnedAuthRateLimitFallback = false;

function resolveRequestId(request: NextRequest) {
  const existing = request.headers.get("x-request-id");
  if (existing) {
    return existing;
  }
  // Web Crypto está disponible en Node 24 y en el runtime de Next; sin fallback a Math.random.
  return crypto.randomUUID();
}

type CspHeader = { name: string; value: string } | null;

function withRequestId(response: NextResponse, requestId: string, csp: CspHeader = null) {
  response.headers.set("x-request-id", requestId);
  if (csp) {
    response.headers.set(csp.name, csp.value);
  }
  return response;
}

// Paths the original auth matcher covered. Everything else reaches the proxy
// only so it can receive the per-request CSP nonce (H2) and must skip the
// session/role logic below, exactly as before the matcher was widened.
function isAuthScopedPath(pathname: string): boolean {
  return (
    matchesPrefix(pathname, "/portal") ||
    matchesPrefix(pathname, "/api") ||
    pathname === "/auth/login" ||
    pathname === "/login"
  );
}

// HTML-rendering paths get a nonce CSP. API routes return JSON/files and keep
// only the static security headers from next.config.ts.
function buildRequestCsp(pathname: string, requestHeaders: Headers): CspHeader {
  if (matchesPrefix(pathname, "/api")) return null;
  const nonce = generateNonce();
  const isDev = process.env.NODE_ENV !== "production";
  const value = buildContentSecurityPolicy(nonce, isDev);
  // Next.js extracts the nonce from this request header during SSR and
  // applies it to its framework scripts; x-nonce is for our own <Script>s.
  requestHeaders.set(NONCE_HEADER, nonce);
  requestHeaders.set("Content-Security-Policy", value);
  // Dev keeps report-only (as before) so HMR/devtools never get blocked.
  return { name: isDev ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy", value };
}

function resolveRole(token: { role?: string; invalidated?: boolean } | null): UserRole | null {
  if (token?.invalidated) return null;
  const roleCandidate = token?.role ?? "";
  return isUserRole(roleCandidate) ? roleCandidate : null;
}

// /api/admin/** and /api/clinical/** backstop below: every app/api/**/route.ts
// under these prefixes already calls requireSession()/requireRole() itself.
// This is a cheap early failsafe in case a route ever forgets that call — it
// does not replace or duplicate per-route role nuance (especially for
// /api/clinical/**, which has legitimate multi-role access controlled
// per-route; only a session-exists check applies to it here).
// Role exclusivity for /portal/admin, /portal/professional, /portal/client,
// and /portal/receptionist is already enforced further down via
// roleFromSlug()/getDefaultDashboardPath() redirect-on-mismatch logic.
const CLINICAL_SESSION_ONLY_PREFIX = "/api/clinical";

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function resolveClientIp(request: NextRequest): string {
  // En Vercel la plataforma fija estas cabeceras; x-forwarded-for puede venir del cliente.
  if (process.env.VERCEL === "1") {
    return (
      request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip")?.trim() ||
      "unknown"
    );
  }
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

/**
 * Los POST de /api/auth/* (login con credenciales, etc.) fallan cerrados en producción si
 * Upstash no está disponible: un limitador en memoria por instancia no frena fuerza bruta en
 * serverless. CI/E2E corre un build de producción sin Upstash a propósito.
 */
function shouldFailClosed(request: NextRequest): boolean {
  return request.method === "POST" && isProductionRuntime() && getRuntimeStage() !== "ci-e2e";
}

function tooManyRequestsResponse(retryAfterSeconds: number) {
  // JSON: el cliente de Auth.js parsea la respuesta; un texto plano rompe la sesión en el navegador.
  return NextResponse.json(
    { error: "Demasiados intentos. Espera un momento e intenta de nuevo." },
    { status: 429, headers: { "Retry-After": retryAfterSeconds.toString() } },
  );
}

// Solo se limitan los métodos que intentan autenticar o cambian estado (login, signin, signout).
// GET /api/auth/session se llama en cada navegación y foco de pestaña: contarlo agotaba el cupo
// de 10/min por IP con uso normal (o de toda una sede tras la misma IP) y devolvía 429.
const RATE_LIMITED_AUTH_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function failClosedResponse(reason: string) {
  if (!warnedAuthRateLimitFallback) {
    console.error(`[ratelimit] Proxy auth rate limit unavailable (${reason}); failing closed.`);
    warnedAuthRateLimitFallback = true;
  }
  return NextResponse.json(
    { error: "Servicio temporalmente no disponible. Intenta más tarde." },
    { status: 503, headers: { "Retry-After": "60" } },
  );
}

export async function applyAuthRateLimit(request: NextRequest): Promise<NextResponse | null> {
  if (!request.nextUrl.pathname.startsWith("/api/auth/")) return null;
  if (!RATE_LIMITED_AUTH_METHODS.has(request.method)) return null;

  const ip = resolveClientIp(request);

  const fallback = () => {
    const result = checkMemoryRateLimit({
      key: `proxy:auth:${ip}`,
      limit: RATE_LIMIT_MAX_REQUESTS,
      windowMs: RATE_LIMIT_WINDOW_SECONDS * 1000,
    });
    return result.allowed ? null : tooManyRequestsResponse(result.retryAfter);
  };

  const upstash = getUpstashRestConfig();

  if (!upstash) {
    if (shouldFailClosed(request)) return failClosedResponse("missing_config");
    if (!warnedAuthRateLimitFallback) {
      console.warn("[ratelimit] Proxy Upstash config missing; using conservative in-memory fallback.");
      warnedAuthRateLimitFallback = true;
    }
    return fallback();
  }

  const key = `rl:auth:${encodeURIComponent(ip)}`;

  try {
    const incrRes = await fetch(`${upstash.url}/incr/${key}`, {
      headers: { Authorization: `Bearer ${upstash.token}` },
    });
    if (!incrRes.ok) throw new Error(`Upstash returned ${incrRes.status}`);
    const { result: count } = (await incrRes.json()) as { result: number };

    if (count === 1) {
      void fetch(`${upstash.url}/expire/${key}/${RATE_LIMIT_WINDOW_SECONDS}`, {
        headers: { Authorization: `Bearer ${upstash.token}` },
      });
    }

    if (count > RATE_LIMIT_MAX_REQUESTS) {
      return tooManyRequestsResponse(RATE_LIMIT_WINDOW_SECONDS);
    }
  } catch (error) {
    if (shouldFailClosed(request)) return failClosedResponse("upstash_error");
    if (!warnedAuthRateLimitFallback) {
      console.warn(
        "[ratelimit] Proxy Upstash unavailable; using conservative in-memory fallback.",
        error instanceof Error ? error.name : "unknown_error",
      );
      warnedAuthRateLimitFallback = true;
    }
    return fallback();
  }

  return null;
}

export default async function proxy(request: NextRequest) {
  const requestId = resolveRequestId(request);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  const { pathname } = request.nextUrl;
  const csp = buildRequestCsp(pathname, requestHeaders);

  if (!isAuthScopedPath(pathname)) {
    return withRequestId(NextResponse.next({ request: { headers: requestHeaders } }), requestId, csp);
  }

  const host = request.headers.get("host") ?? "";
  const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const secret = process.env.AUTH_JWT_SECRET ?? process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) {
    const message = "NEXTAUTH_SECRET is not configured.";
    if (process.env.NODE_ENV === "production") {
      console.error(message);
      throw new Error(message);
    }
    console.warn(message);
  }
  // @auth/core v5 beta removed the HTTPS auto-detection in getToken — it defaults
  // to secureCookie=false (reads "next-auth.session-token") even on HTTPS.
  // We must pass cookieName explicitly so the proxy reads the same cookie that
  // authConfig.cookies.sessionToken.name writes ("__Secure-next-auth.session-token").
  const cookieName = getSessionCookieName(getInferredAuthBaseUrl());
  const token = await getToken({ req: request, secret, cookieName });
  let role = resolveRole(token);
  const testRoleCookie = request.cookies.get("dentpro-test-role")?.value ?? "";
  const isProductionEnv = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  const allowE2EBypass = isLocalE2EAuthRuntime(host);
  const bypassEnabled =
    (allowE2EBypass || !isProductionEnv) &&
    process.env.TEST_AUTH_BYPASS === "1" &&
    isLocalhost &&
    testRoleCookie.length > 0 &&
    // Never honour the test-role cookie on Vercel, whatever the other env flags say.
    process.env.VERCEL !== "1" &&
    !process.env.VERCEL_ENV;

  if (!role && bypassEnabled) {
    const testRole = testRoleCookie || "ADMINISTRADOR";
    if (isUserRole(testRole)) {
      role = testRole;
    }
  }
  const isLoginRoute = pathname === "/auth/login" || pathname === "/login";
  const isPortalRoute = pathname.startsWith("/portal");

  if (isLoginRoute && role) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getDefaultDashboardPath(role);
    redirectUrl.search = "";
    return withRequestId(NextResponse.redirect(redirectUrl), requestId, csp);
  }

  const rateLimitResponse = await applyAuthRateLimit(request);
  if (rateLimitResponse) return withRequestId(rateLimitResponse, requestId, csp);

  // Backstop only — every app/api/**/route.ts under these prefixes already
  // calls requireSession()/requireRole() itself. This just adds a cheap,
  // early failsafe in case a route ever forgets that call. Do not replace
  // or duplicate the per-route role nuance here, especially for
  // /api/clinical/** which has legitimate multi-role access controlled
  // per-route — only a session-exists check applies to it.
  const isAdminApiRoute = matchesPrefix(pathname, "/api/admin");
  const isClinicalApiRoute = matchesPrefix(pathname, CLINICAL_SESSION_ONLY_PREFIX);

  if (isAdminApiRoute || isClinicalApiRoute) {
    if (!role) {
      return withRequestId(errorResponse("No autorizado.", 401), requestId, csp);
    }
    if (isAdminApiRoute && role !== "ADMINISTRADOR") {
      return withRequestId(errorResponse("No autorizado.", 403), requestId, csp);
    }
  }

  if (!isPortalRoute) {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    return withRequestId(response, requestId, csp);
  }

  if (!role) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/login";
    const callbackPath = `${pathname}${request.nextUrl.search}`;
    redirectUrl.searchParams.set("callbackUrl", callbackPath);
    return withRequestId(NextResponse.redirect(redirectUrl), requestId, csp);
  }

  const PORTAL_SHARED_PATHS = ["/portal/change-password"];
  if (PORTAL_SHARED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    return withRequestId(response, requestId, csp);
  }

  const segments = pathname.split("/").filter(Boolean);
  const slug = segments[1] ?? "";
  const requestedRole = slug ? roleFromSlug(slug) : null;

  if (!requestedRole) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getDefaultDashboardPath(role);
    redirectUrl.search = "";
    return withRequestId(NextResponse.redirect(redirectUrl), requestId, csp);
  }

  const allowAdminReceptionist = role === "ADMINISTRADOR" && requestedRole === "RECEPCIONISTA";

  if (requestedRole !== role && !allowAdminReceptionist) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getDefaultDashboardPath(role);
    redirectUrl.search = "";
    return withRequestId(NextResponse.redirect(redirectUrl), requestId, csp);
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  return withRequestId(response, requestId, csp);
}

export const config = {
  matcher: [
    "/portal/:path*",
    "/auth/login",
    "/login",
    "/api/:path*",
    // Every other HTML page, so it receives the per-request CSP nonce (H2).
    // Skips Next internals, public files with an extension, and router
    // prefetches (RSC payloads, not HTML documents).
    {
      source:
        "/((?!api|_next/static|_next/image|_vercel|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|webmanifest|json|js|css|map|woff|woff2)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
