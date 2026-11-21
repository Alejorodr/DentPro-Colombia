import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/api/_utils/ratelimit", () => ({
  enforceRateLimit: vi.fn(async () => null),
}));

import { getClientIp, isOpsIpAllowed } from "@/app/api/ops/_utils";

function makeRequest(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/ops/auth-diagnostics", { headers });
}

describe("isOpsIpAllowed", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("OPS_IP_ALLOWLIST", "");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("RUN_E2E", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("denies when allowlist is empty in production (NODE_ENV)", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isOpsIpAllowed(makeRequest({ "x-real-ip": "1.2.3.4" }))).toBe(false);
  });

  it("denies when allowlist is empty on Vercel production even if NODE_ENV is not production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(isOpsIpAllowed(makeRequest({ "x-vercel-forwarded-for": "1.2.3.4" }))).toBe(false);
  });

  it("allows when allowlist is empty in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isOpsIpAllowed(makeRequest())).toBe(true);
  });

  it("allows when allowlist is empty in test", () => {
    vi.stubEnv("NODE_ENV", "test");
    expect(isOpsIpAllowed(makeRequest())).toBe(true);
  });

  it("allows empty allowlist in production for local/CI E2E (RUN_E2E=1, not Vercel)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RUN_E2E", "1");
    expect(isOpsIpAllowed(makeRequest())).toBe(true);
  });

  it("does not honor RUN_E2E on Vercel", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RUN_E2E", "1");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(isOpsIpAllowed(makeRequest())).toBe(false);
  });

  it("allows a listed IP in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("OPS_IP_ALLOWLIST", "10.0.0.1, 1.2.3.4");
    expect(isOpsIpAllowed(makeRequest({ "x-real-ip": "1.2.3.4" }))).toBe(true);
  });

  it("denies an unlisted IP in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("OPS_IP_ALLOWLIST", "10.0.0.1");
    expect(isOpsIpAllowed(makeRequest({ "x-real-ip": "1.2.3.4" }))).toBe(false);
  });

  it("enforces a configured allowlist in development too", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("OPS_IP_ALLOWLIST", "10.0.0.1");
    expect(isOpsIpAllowed(makeRequest({ "x-real-ip": "1.2.3.4" }))).toBe(false);
  });

  it("on Vercel ignores a spoofed x-forwarded-for and uses x-vercel-forwarded-for", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("OPS_IP_ALLOWLIST", "10.0.0.1");

    const spoofed = makeRequest({
      "x-forwarded-for": "10.0.0.1",
      "x-vercel-forwarded-for": "203.0.113.9",
    });
    expect(isOpsIpAllowed(spoofed)).toBe(false);

    const legit = makeRequest({
      "x-forwarded-for": "203.0.113.9",
      "x-vercel-forwarded-for": "10.0.0.1",
    });
    expect(isOpsIpAllowed(legit)).toBe(true);
  });
});

describe("getClientIp", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("VERCEL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("on Vercel prefers x-vercel-forwarded-for, then x-real-ip, never x-forwarded-for", () => {
    vi.stubEnv("VERCEL", "1");
    expect(
      getClientIp(makeRequest({ "x-vercel-forwarded-for": "1.1.1.1", "x-real-ip": "2.2.2.2", "x-forwarded-for": "3.3.3.3" })),
    ).toBe("1.1.1.1");
    expect(getClientIp(makeRequest({ "x-real-ip": "2.2.2.2", "x-forwarded-for": "3.3.3.3" }))).toBe("2.2.2.2");
    expect(getClientIp(makeRequest({ "x-forwarded-for": "3.3.3.3" }))).toBe("unknown");
  });

  it("outside Vercel prefers x-real-ip, then first x-forwarded-for hop", () => {
    expect(getClientIp(makeRequest({ "x-real-ip": "2.2.2.2", "x-forwarded-for": "3.3.3.3" }))).toBe("2.2.2.2");
    expect(getClientIp(makeRequest({ "x-forwarded-for": "3.3.3.3, 4.4.4.4" }))).toBe("3.3.3.3");
    expect(getClientIp(makeRequest())).toBe("unknown");
  });
});
