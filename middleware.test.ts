import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { applyAuthRateLimit } = await import("./proxy");

// Wrap applyAuthRateLimit to match test expectations: null → 200 pass-through
async function middleware(req: NextRequest): Promise<NextResponse> {
  return (await applyAuthRateLimit(req)) ?? new NextResponse(null, { status: 200 });
}

function req(path: string, ip = "1.2.3.4") {
  return new NextRequest(`http://localhost${path}`, {
    headers: { "x-forwarded-for": ip },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("middleware", () => {
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
    mockFetch.mockResolvedValue({ json: async () => ({ result: 5 }) });
    const res = await middleware(req("/api/auth/signin"));
    expect(res.status).toBe(200);
  });

  it("returns 429 when over the rate limit", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    mockFetch.mockResolvedValue({ json: async () => ({ result: 11 }) });
    const res = await middleware(req("/api/auth/signin"));
    expect(res.status).toBe(429);
  });

  it("passes through when Upstash fetch throws (graceful degradation)", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    mockFetch.mockRejectedValue(new Error("network error"));
    const res = await middleware(req("/api/auth/signin"));
    expect(res.status).toBe(200);
  });
});
