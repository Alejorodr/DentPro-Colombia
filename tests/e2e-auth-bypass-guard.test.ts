import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { isLocalE2EAuthRuntime } from "@/lib/auth/runtime";

vi.stubGlobal("fetch", vi.fn());

const { default: proxy } = await import("../proxy");

function portalRequestWithTestRole(role = "ADMINISTRADOR") {
  return new NextRequest("http://localhost:3000/portal/admin", {
    headers: { host: "localhost:3000", cookie: `dentpro-test-role=${role}` },
  });
}

function enableLocalE2EBypass() {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("NEXTAUTH_SECRET", "test-secret-test-secret-test-secret");
  vi.stubEnv("RUN_E2E", "1");
  vi.stubEnv("TEST_AUTH_BYPASS", "1");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("VERCEL_ENV", "");
}

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe("isLocalE2EAuthRuntime", () => {
  it("allows the bypass on localhost when RUN_E2E and TEST_AUTH_BYPASS are set", () => {
    enableLocalE2EBypass();
    expect(isLocalE2EAuthRuntime("localhost:3000")).toBe(true);
    expect(isLocalE2EAuthRuntime("http://127.0.0.1:3000")).toBe(true);
  });

  it("never allows the bypass on Vercel (VERCEL=1)", () => {
    enableLocalE2EBypass();
    vi.stubEnv("VERCEL", "1");
    expect(isLocalE2EAuthRuntime("localhost:3000")).toBe(false);
  });

  it("never allows the bypass on Vercel (VERCEL_ENV set)", () => {
    enableLocalE2EBypass();
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(isLocalE2EAuthRuntime("localhost:3000")).toBe(false);
  });
});

describe("proxy dentpro-test-role cookie bypass", () => {
  it("honours the test-role cookie in a local E2E runtime", async () => {
    enableLocalE2EBypass();
    const res = await proxy(portalRequestWithTestRole());
    expect(res.headers.get("location") ?? "").not.toContain("/auth/login");
  });

  it("ignores the test-role cookie when VERCEL=1", async () => {
    enableLocalE2EBypass();
    vi.stubEnv("VERCEL", "1");
    const res = await proxy(portalRequestWithTestRole());
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/auth/login");
  });

  it("ignores the test-role cookie when VERCEL_ENV is set", async () => {
    enableLocalE2EBypass();
    vi.stubEnv("VERCEL_ENV", "preview");
    const res = await proxy(portalRequestWithTestRole());
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/auth/login");
  });
});
