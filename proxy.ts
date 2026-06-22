import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { isLocalE2EAuthRuntime } from "@/lib/auth/runtime";
import { getDefaultDashboardPath, isUserRole, roleFromSlug, type UserRole } from "@/lib/auth/roles";

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 10;

function resolveRequestId(request: NextRequest) {
  const existing = request.headers.get("x-request-id");
  if (existing) {
    return existing;
  }
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(16).slice(2);
}

function withRequestId(response: NextResponse, requestId: string) {
  response.headers.set("x-request-id", requestId);
  return response;
}

function resolveRole(token: { role?: string } | null): UserRole | null {
  const roleCandidate = token?.role ?? "";
  return isUserRole(roleCandidate) ? roleCandidate : null;
}

export async function applyAuthRateLimit(request: NextRequest): Promise<NextResponse | null> {
  if (!request.nextUrl.pathname.startsWith("/api/auth/")) return null;

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!upstashUrl || !upstashToken) return null;

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const key = `rl:auth:${ip}`;

  try {
    const incrRes = await fetch(`${upstashUrl}/incr/${key}`, {
      headers: { Authorization: `Bearer ${upstashToken}` },
    });
    const { result: count } = (await incrRes.json()) as { result: number };

    if (count === 1) {
      void fetch(`${upstashUrl}/expire/${key}/${RATE_LIMIT_WINDOW_SECONDS}`, {
        headers: { Authorization: `Bearer ${upstashToken}` },
      });
    }

    if (count > RATE_LIMIT_MAX_REQUESTS) {
      return new NextResponse("Too many requests", { status: 429 });
    }
  } catch {
    // Upstash unavailable — allow through
  }

  return null;
}

export default async function proxy(request: NextRequest) {
  const requestId = resolveRequestId(request);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  const { pathname } = request.nextUrl;
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
  const token = await getToken({ req: request, secret });
  let role = resolveRole(token);
  const testRoleCookie = request.cookies.get("dentpro-test-role")?.value ?? "";
  const isProductionEnv = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  const allowE2EBypass = isLocalE2EAuthRuntime(host);
  const bypassEnabled =
    (allowE2EBypass || !isProductionEnv) &&
    process.env.TEST_AUTH_BYPASS === "1" &&
    isLocalhost &&
    testRoleCookie.length > 0;

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
    return withRequestId(NextResponse.redirect(redirectUrl), requestId);
  }

  const rateLimitResponse = await applyAuthRateLimit(request);
  if (rateLimitResponse) return withRequestId(rateLimitResponse, requestId);

  if (!isPortalRoute) {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    return withRequestId(response, requestId);
  }

  if (!role) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/login";
    const callbackPath = `${pathname}${request.nextUrl.search}`;
    redirectUrl.searchParams.set("callbackUrl", callbackPath);
    return withRequestId(NextResponse.redirect(redirectUrl), requestId);
  }

  const segments = pathname.split("/").filter(Boolean);
  const slug = segments[1] ?? "";
  const requestedRole = slug ? roleFromSlug(slug) : null;

  if (!requestedRole) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getDefaultDashboardPath(role);
    redirectUrl.search = "";
    return withRequestId(NextResponse.redirect(redirectUrl), requestId);
  }

  const allowAdminReceptionist = role === "ADMINISTRADOR" && requestedRole === "RECEPCIONISTA";

  if (requestedRole !== role && !allowAdminReceptionist) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getDefaultDashboardPath(role);
    redirectUrl.search = "";
    return withRequestId(NextResponse.redirect(redirectUrl), requestId);
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  return withRequestId(response, requestId);
}

export const config = {
  matcher: ["/portal/:path*", "/auth/login", "/login", "/api/:path*"],
};
