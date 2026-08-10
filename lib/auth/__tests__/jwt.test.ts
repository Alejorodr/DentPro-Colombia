import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetAuthJwtSecretForTests,
  getJwtSecretKey,
} from "@/lib/auth/jwt";

const decoder = new TextDecoder();

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
}

describe("getJwtSecretKey", () => {
  beforeEach(() => {
    resetEnv();
    __resetAuthJwtSecretForTests();
  });

  afterEach(() => {
    resetEnv();
    __resetAuthJwtSecretForTests();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns the configured AUTH_JWT_SECRET when available", () => {
    process.env.AUTH_JWT_SECRET = "my-secret";

    const key = getJwtSecretKey();

    expect(decoder.decode(key)).toBe("my-secret");
  });

  it("falls back to NEXTAUTH_SECRET or AUTH_SECRET when AUTH_JWT_SECRET is missing", () => {
    delete process.env.AUTH_JWT_SECRET;
    process.env.NEXTAUTH_SECRET = "nextauth";

    let key = getJwtSecretKey();
    expect(decoder.decode(key)).toBe("nextauth");

    __resetAuthJwtSecretForTests();
    delete process.env.NEXTAUTH_SECRET;
    process.env.AUTH_SECRET = "auth";

    key = getJwtSecretKey();
    expect(decoder.decode(key)).toBe("auth");
  });

  it("generates a stable development secret when nothing is configured", () => {
    delete process.env.AUTH_JWT_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.AUTH_SECRET;
    vi.stubEnv("NODE_ENV", "development");

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const first = getJwtSecretKey();
    const second = getJwtSecretKey();

    expect(decoder.decode(first)).toHaveLength(128);
    expect(first).toStrictEqual(second);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("throws in production when no secret is configured", () => {
    delete process.env.AUTH_JWT_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.AUTH_SECRET;
    vi.stubEnv("NODE_ENV", "production");

    expect(() => getJwtSecretKey()).toThrowError("AUTH_JWT_SECRET is not configured");
  });
});
