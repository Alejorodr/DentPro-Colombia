import { beforeEach, describe, expect, it, vi } from "vitest";

import { authorizeCredentials } from "@/lib/auth/credentials";
import { authenticateUser } from "@/lib/auth/users";

vi.mock("@/lib/auth/users", () => ({
  authenticateUser: vi.fn(),
  findUserByEmail: vi.fn(),
}));

const mockedAuthenticateUser = vi.mocked(authenticateUser);

describe("authorizeCredentials per-account rate limit", () => {
  beforeEach(() => {
    mockedAuthenticateUser.mockReset();
    mockedAuthenticateUser.mockResolvedValue(null);
    process.env.TEST_AUTH_BYPASS = "0";
    process.env.DATABASE_URL = "postgresql://example";
    process.env.NEXTAUTH_URL = "";
  });

  it("blocks the 11th attempt for the same account within the window without checking the password", async () => {
    const email = `victima-${Date.now()}@dentpro.test`;
    for (let i = 0; i < 10; i += 1) {
      await authorizeCredentials({ email, password: `wrong-${i}` });
    }
    expect(mockedAuthenticateUser).toHaveBeenCalledTimes(10);

    const result = await authorizeCredentials({ email, password: "wrong-final" });
    expect(result).toBeNull();
    expect(mockedAuthenticateUser).toHaveBeenCalledTimes(10);
  });

  it("normalizes case and whitespace so the limit applies to the same account", async () => {
    const base = `caso-${Date.now()}@dentpro.test`;
    for (let i = 0; i < 10; i += 1) {
      await authorizeCredentials({ email: i % 2 ? base.toUpperCase() : `  ${base} `, password: "x" });
    }
    await authorizeCredentials({ email: base, password: "x" });
    expect(mockedAuthenticateUser).toHaveBeenCalledTimes(10);
  });

  it("does not affect a different account", async () => {
    const blocked = `bloqueada-${Date.now()}@dentpro.test`;
    for (let i = 0; i < 11; i += 1) {
      await authorizeCredentials({ email: blocked, password: "x" });
    }
    mockedAuthenticateUser.mockClear();
    await authorizeCredentials({ email: `otra-${Date.now()}@dentpro.test`, password: "x" });
    expect(mockedAuthenticateUser).toHaveBeenCalledTimes(1);
  });
});

describe("authorizeCredentials fail-closed in production", () => {
  it("rejects login when the distributed limiter is unavailable in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CI", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    mockedAuthenticateUser.mockReset();
    const result = await authorizeCredentials({ email: `prod-${Date.now()}@dentpro.test`, password: "x" });
    expect(result).toBeNull();
    expect(mockedAuthenticateUser).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});
