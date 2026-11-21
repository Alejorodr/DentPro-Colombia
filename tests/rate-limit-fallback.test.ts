import { beforeEach, describe, expect, it, vi } from "vitest";

describe("rate limit production fallback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.doUnmock("@upstash/ratelimit");
    vi.doUnmock("@upstash/redis");
  });

  it("keeps limiting when Upstash is not configured in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const { enforceRateLimit } = await import("@/app/api/_utils/ratelimit");
    const request = new Request("http://localhost/api/auth/login", { headers: { "x-real-ip": "198.51.100.10" } });

    for (let index = 0; index < 10; index += 1) {
      expect(await enforceRateLimit(request, "test:missing", { limit: 10, window: "1 m", windowMs: 60_000 })).toBeNull();
    }

    const response = await enforceRateLimit(request, "test:missing", { limit: 10, window: "1 m", windowMs: 60_000 });
    expect(response?.status).toBe(429);
  });

  it("falls back when the configured Upstash limiter throws", async () => {
    const limit = vi.fn().mockRejectedValue(new Error("upstash timeout"));
    vi.doMock("@upstash/redis", () => ({ Redis: { fromEnv: vi.fn(() => ({})) } }));
    vi.doMock("@upstash/ratelimit", () => ({
      Ratelimit: class {
        static fixedWindow() { return {}; }
        limit = limit;
      },
    }));
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    const { enforceRateLimit } = await import("@/app/api/_utils/ratelimit");
    const request = new Request("http://localhost/api/auth/login", { headers: { "x-real-ip": "198.51.100.11" } });

    for (let index = 0; index < 2; index += 1) {
      expect(await enforceRateLimit(request, "test:error", { limit: 2, window: "1 m", windowMs: 60_000 })).toBeNull();
    }

    const response = await enforceRateLimit(request, "test:error", { limit: 2, window: "1 m", windowMs: 60_000 });
    expect(response?.status).toBe(429);
    expect(limit).toHaveBeenCalled();
  });
});
