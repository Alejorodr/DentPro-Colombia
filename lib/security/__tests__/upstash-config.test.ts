import { afterEach, describe, expect, it, vi } from "vitest";

import { getUpstashRestConfig } from "@/lib/security/upstash-config";

function clear() {
  for (const name of ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN", "KV_REST_API_READ_ONLY_TOKEN"]) {
    vi.stubEnv(name, "");
  }
}

afterEach(() => vi.unstubAllEnvs());

describe("getUpstashRestConfig", () => {
  it("returns null when nothing is configured", () => {
    clear();
    expect(getUpstashRestConfig()).toBeNull();
  });

  it("reads the Upstash-native names", () => {
    clear();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://a.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok-a");
    expect(getUpstashRestConfig()).toEqual({ url: "https://a.upstash.io", token: "tok-a" });
  });

  it("reads the Vercel Marketplace KV_REST_API_* names", () => {
    clear();
    vi.stubEnv("KV_REST_API_URL", "https://kv.upstash.io");
    vi.stubEnv("KV_REST_API_TOKEN", "tok-kv");
    expect(getUpstashRestConfig()).toEqual({ url: "https://kv.upstash.io", token: "tok-kv" });
  });

  it("prefers Upstash-native names and trims pasted whitespace", () => {
    clear();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", " https://a.upstash.io\n");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok-a ");
    vi.stubEnv("KV_REST_API_URL", "https://kv.upstash.io");
    vi.stubEnv("KV_REST_API_TOKEN", "tok-kv");
    expect(getUpstashRestConfig()).toEqual({ url: "https://a.upstash.io", token: "tok-a" });
  });

  it("never falls back to the read-only token", () => {
    clear();
    vi.stubEnv("KV_REST_API_URL", "https://kv.upstash.io");
    vi.stubEnv("KV_REST_API_READ_ONLY_TOKEN", "ro");
    expect(getUpstashRestConfig()).toBeNull();
  });
});
