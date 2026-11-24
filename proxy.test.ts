import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const middlewareModule = await import("./proxy");
const { applyAuthRateLimit, default: defaultMiddleware, config } = middlewareModule;

// Wrap applyAuthRateLimit to match test expectations: null → 200 pass-through
async function middleware(req: NextRequest): Promise<NextResponse> {
  return (await applyAuthRateLimit(req)) ?? new NextResponse(null, { status: 200 });
}

function req(path: string, ip = "1.2.3.4", method = "GET") {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { "x-forwarded-for": ip },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
  vi.unstubAllEnvs();
});

describe("middleware", () => {
  it("exports a valid Next.js middleware handler and matcher config", () => {
    expect(typeof defaultMiddleware).toBe("function");
    expect(config).toBeDefined();
    expect(config.matcher).toContain("/portal/:path*");
    expect(config.matcher).toContain("/api/:path*");
  });

  it("passes non-auth routes without calling Upstash", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    const res = await middleware(req("/api/appointments"));
    expect(res.status).toBe(200);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("passes auth routes when Upstash is not configured", async () => {
    const res = await middleware(req("/api/auth/signin"));
    expect(res.status).toBe(200);
  });

  it("allows requests under the rate limit", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ result: 5 }) });
    const res = await middleware(req("/api/auth/signin", "1.2.3.5", "POST"));
    expect(res.status).toBe(200);
  });

  it("returns 429 when over the rate limit", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ result: 11 }) });
    const res = await middleware(req("/api/auth/signin", "1.2.3.6", "POST"));
    expect(res.status).toBe(429);
    // Auth.js parsea la respuesta como JSON; un 429 en texto plano rompía la sesión del cliente.
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toHaveProperty("error");
  });

  it("never rate-limits or counts GET /api/auth/session", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ result: 999 }) });
    const res = await middleware(req("/api/auth/session", "1.2.3.8"));
    expect(res.status).toBe(200);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("keeps navigation working past the limit without Upstash (E2E/dev memory fallback)", async () => {
    for (let i = 0; i < 25; i += 1) {
      const res = await middleware(req("/api/auth/session", "1.2.3.9"));
      expect(res.status).toBe(200);
    }
  });

  it("still blocks credential POST bursts with the memory fallback", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      statuses.push((await middleware(req("/api/auth/callback/credentials", "1.2.3.10", "POST"))).status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
  });

  it("uses the conservative fallback when Upstash fetch throws", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    mockFetch.mockRejectedValue(new Error("network error"));
    const res = await middleware(req("/api/auth/signin", "1.2.3.7", "POST"));
    expect(res.status).toBe(200);
  });
});

describe("proxy CSP nonce (H2)", () => {
  function pageReq(path: string) {
    return new NextRequest(`http://localhost${path}`);
  }

  function nonceFrom(policy: string | null) {
    return policy?.match(/'nonce-([^']+)'/)?.[1];
  }

  it("matches every HTML page, not only auth-scoped paths", () => {
    const pageMatcher = config.matcher.find(
      (entry): entry is Exclude<typeof entry, string> => typeof entry !== "string",
    );
    expect(pageMatcher?.source).toContain("_next/static");
    expect(config.matcher).toContain("/auth/login");
    expect(config.matcher).toContain("/login");
  });

  it("sets an enforced nonce CSP with strict-dynamic and no unsafe-inline scripts in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await defaultMiddleware(pageReq("/"));
    const policy = res.headers.get("content-security-policy");
    expect(policy).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'(;|$)/);
    expect(policy).not.toContain("unsafe-eval");
    expect(policy?.split(";").find((d) => d.trim().startsWith("script-src"))).not.toContain("unsafe-inline");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    // Forwarded to the render so Next.js can stamp the nonce on its scripts.
    const nonce = nonceFrom(policy);
    expect(res.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
    expect(res.headers.get("x-middleware-request-content-security-policy")).toBe(policy);
  });

  it("generates a fresh nonce per request", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const a = nonceFrom((await defaultMiddleware(pageReq("/"))).headers.get("content-security-policy"));
    const b = nonceFrom((await defaultMiddleware(pageReq("/"))).headers.get("content-security-policy"));
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });

  it("keeps development report-only with unsafe-eval", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const res = await defaultMiddleware(pageReq("/servicios/ortodoncia"));
    expect(res.headers.get("content-security-policy")).toBeNull();
    expect(res.headers.get("content-security-policy-report-only")).toContain("'unsafe-eval'");
  });

  it("applies CSP to portal redirects and skips it for API routes", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret-test-secret-test-secret");
    const portal = await defaultMiddleware(pageReq("/portal/admin"));
    expect(portal.status).toBe(307);
    expect(portal.headers.get("location")).toContain("/auth/login");
    expect(portal.headers.get("content-security-policy")).toContain("'strict-dynamic'");

    const api = await defaultMiddleware(pageReq("/api/appointments"));
    expect(api.headers.get("content-security-policy")).toBeNull();
    expect(api.headers.get("x-middleware-request-x-nonce")).toBeNull();
  });
});

describe("proxy auth secret (DOG-6)", () => {
  it("does not throw in production when AUTH_JWT_SECRET is empty but NEXTAUTH_SECRET is set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_JWT_SECRET", "");
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret-test-secret-test-secret");
    const res = await defaultMiddleware(
      new NextRequest("http://localhost/portal/admin", { headers: { accept: "text/html" } }),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/auth/login");
  });
});

describe("proxy auth rate limit fail-closed (fase 2)", () => {
  function post(path: string, headers: Record<string, string> = {}) {
    return new NextRequest(`http://localhost${path}`, {
      method: "POST",
      headers: { "x-forwarded-for": "9.9.9.9", ...headers },
    });
  }

  it("returns 503 for auth POST in production when Upstash is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CI", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const res = await applyAuthRateLimit(post("/api/auth/callback/credentials"));
    expect(res?.status).toBe(503);
    expect(res?.headers.get("Retry-After")).toBe("60");
  });

  it("returns 503 for auth POST in production when Upstash errors", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CI", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    mockFetch.mockRejectedValueOnce(new Error("down"));
    const res = await applyAuthRateLimit(post("/api/auth/callback/credentials"));
    expect(res?.status).toBe(503);
  });

  it("does not fail closed for auth GET (session) in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CI", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const res = await applyAuthRateLimit(req("/api/auth/session", "8.8.4.4"));
    expect(res).toBeNull();
  });

  it("does not fail closed in CI E2E production builds", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CI", "true");
    vi.stubEnv("RUN_E2E", "1");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const res = await applyAuthRateLimit(post("/api/auth/callback/credentials", { "x-forwarded-for": "7.7.7.7" }));
    expect(res).toBeNull();
  });

  it("accepts the Vercel Marketplace KV_REST_API_* names (no 503 in production)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CI", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("KV_REST_API_URL", "https://kv.upstash.io");
    vi.stubEnv("KV_REST_API_TOKEN", "kv-tok");
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ result: 1 }) });
    const res = await applyAuthRateLimit(post("/api/auth/callback/credentials", { "x-forwarded-for": "4.4.4.4" }));
    expect(res).toBeNull();
    expect(String(mockFetch.mock.calls[0]?.[0])).toContain("https://kv.upstash.io/incr/");
  });

  it("on Vercel keys on x-vercel-forwarded-for, ignoring a spoofed x-forwarded-for", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ result: 1 }) });
    await applyAuthRateLimit(post("/api/auth/callback/credentials", { "x-forwarded-for": "6.6.6.6", "x-vercel-forwarded-for": "5.5.5.5" }));
    expect(String(mockFetch.mock.calls[0]?.[0])).toContain("rl:auth:5.5.5.5");
  });
});
