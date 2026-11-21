import { beforeEach, describe, expect, it, vi } from "vitest";

const { captureMessage, loggerError } = vi.hoisted(() => ({
  captureMessage: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureMessage }));
vi.mock("@/lib/logger", () => ({
  logger: { error: loggerError, warn: vi.fn(), info: vi.fn() },
}));

const CONFIG = { limit: 5, window: "1 m", windowMs: 60_000 } as const;

function buildRequest(ip: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/auth/register", { headers: { "x-forwarded-for": ip, ...headers } });
}

function stubProductionWithoutUpstash() {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
}

describe("rate limit fail-closed for sensitive buckets", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.doUnmock("@upstash/ratelimit");
    vi.doUnmock("@upstash/redis");
    vi.stubEnv("CI", "");
    vi.stubEnv("RUN_E2E", "");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("returns 503 for auth/ops buckets in production without Upstash and reports once", async () => {
    stubProductionWithoutUpstash();
    const { enforceRateLimit } = await import("@/app/api/_utils/ratelimit");

    const first = await enforceRateLimit(buildRequest("198.51.100.20"), "auth:register", CONFIG);
    expect(first?.status).toBe(503);
    expect(first?.headers.get("Retry-After")).toBe("60");
    expect(await first?.json()).toEqual({ error: "Servicio temporalmente no disponible. Intenta más tarde." });

    const second = await enforceRateLimit(buildRequest("198.51.100.21"), "ops", CONFIG);
    expect(second?.status).toBe(503);

    expect(loggerError).toHaveBeenCalledTimes(1);
    expect(captureMessage).toHaveBeenCalledTimes(1);
  });

  it("keeps the memory fallback for non-sensitive buckets in production", async () => {
    stubProductionWithoutUpstash();
    const { enforceRateLimit } = await import("@/app/api/_utils/ratelimit");

    expect(await enforceRateLimit(buildRequest("198.51.100.22"), "search", CONFIG)).toBeNull();
    expect(await enforceRateLimit(buildRequest("198.51.100.22"), "appointments:create", CONFIG)).toBeNull();
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it("honours an explicit failClosed option for any key", async () => {
    stubProductionWithoutUpstash();
    const { enforceRateLimit } = await import("@/app/api/_utils/ratelimit");

    const forced = await enforceRateLimit(buildRequest("198.51.100.23"), "search", CONFIG, { failClosed: true });
    expect(forced?.status).toBe(503);
    const relaxed = await enforceRateLimit(buildRequest("198.51.100.24"), "auth:register", CONFIG, { failClosed: false });
    expect(relaxed).toBeNull();
  });

  it("returns 503 for sensitive buckets when Upstash errors in production", async () => {
    const limit = vi.fn().mockRejectedValue(new Error("upstash timeout"));
    vi.doMock("@upstash/redis", () => ({ Redis: { fromEnv: vi.fn(() => ({})) } }));
    vi.doMock("@upstash/ratelimit", () => ({
      Ratelimit: class {
        static fixedWindow() {
          return {};
        }
        limit = limit;
      },
    }));
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    const { enforceRateLimit } = await import("@/app/api/_utils/ratelimit");

    const sensitive = await enforceRateLimit(buildRequest("198.51.100.25"), "auth:forgot-password", CONFIG);
    expect(sensitive?.status).toBe(503);
    expect(limit).toHaveBeenCalled();
    expect(await enforceRateLimit(buildRequest("198.51.100.26"), "search", CONFIG)).toBeNull();
  });

  it("does not fail closed outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const { enforceRateLimit } = await import("@/app/api/_utils/ratelimit");

    expect(await enforceRateLimit(buildRequest("198.51.100.27"), "auth:register", CONFIG)).toBeNull();
  });

  it("does not fail closed in the CI/E2E production build", async () => {
    stubProductionWithoutUpstash();
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("CI", "true");
    vi.stubEnv("RUN_E2E", "1");
    const { enforceRateLimit } = await import("@/app/api/_utils/ratelimit");

    expect(await enforceRateLimit(buildRequest("198.51.100.28"), "auth:register", CONFIG)).toBeNull();
  });
});

describe("rate limit client IP resolution", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("prefers x-vercel-forwarded-for then x-real-ip on Vercel", async () => {
    vi.stubEnv("VERCEL", "1");
    const { getClientIp } = await import("@/app/api/_utils/ratelimit");

    expect(
      getClientIp(
        buildRequest("203.0.113.1, 10.0.0.1", {
          "x-vercel-forwarded-for": "198.51.100.30",
          "x-real-ip": "198.51.100.31",
        }),
      ),
    ).toBe("198.51.100.30");
    expect(getClientIp(buildRequest("203.0.113.1", { "x-real-ip": "198.51.100.31" }))).toBe("198.51.100.31");
    expect(getClientIp(buildRequest("203.0.113.1"))).toBe("203.0.113.1");
  });

  it("uses the first x-forwarded-for entry off Vercel", async () => {
    vi.stubEnv("VERCEL", "");
    const { getClientIp } = await import("@/app/api/_utils/ratelimit");

    expect(getClientIp(buildRequest("203.0.113.1, 10.0.0.1", { "x-vercel-forwarded-for": "198.51.100.30" }))).toBe(
      "203.0.113.1",
    );
    expect(getClientIp(new Request("http://localhost/", { headers: { "x-real-ip": "198.51.100.31" } }))).toBe(
      "198.51.100.31",
    );
    expect(getClientIp(new Request("http://localhost/"))).toBe("unknown");
  });
});
