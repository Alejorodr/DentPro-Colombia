import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetAuthJwtSecretForTests,
  getJwtSecretKey,
} from "@/lib/auth/jwt";

const decoder = new TextDecoder();
const FALLBACK_SECRET_PATH = path.join(
  tmpdir(),
  "dentpro-colombia",
  "auth-jwt-secret.txt",
);

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
}

describe("getJwtSecretKey", () => {
  beforeEach(() => {
    resetEnv();
    __resetAuthJwtSecretForTests();
  });

  afterEach(() => {
    resetEnv();
    __resetAuthJwtSecretForTests();
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
    process.env.NODE_ENV = "development";

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const first = getJwtSecretKey();
    const second = getJwtSecretKey();

    expect(decoder.decode(first)).toHaveLength(128);
    expect(first).toStrictEqual(second);
    expect(warnSpy).toHaveBeenCalled();
    expect(fs.readFileSync(FALLBACK_SECRET_PATH, "utf8").trim()).toBe(
      decoder.decode(first),
    );
  });

  it("persists a fallback secret even in production when nothing is configured", () => {
    delete process.env.AUTH_JWT_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.AUTH_SECRET;
    process.env.NODE_ENV = "production";

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const key = getJwtSecretKey();
    const decoded = decoder.decode(key);

    expect(decoded).toHaveLength(128);
    expect(warnSpy).toHaveBeenCalled();
    expect(fs.readFileSync(FALLBACK_SECRET_PATH, "utf8").trim()).toBe(decoded);
  });
});
