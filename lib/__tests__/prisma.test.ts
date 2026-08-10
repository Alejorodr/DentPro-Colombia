import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
}

describe("getPrismaClient", () => {
  beforeEach(async () => {
    resetEnv();
    vi.resetModules();
  });

  afterEach(async () => {
    const prismaModule = await import("@/lib/prisma");
    prismaModule.__resetPrismaClientForTests();
    resetEnv();
    vi.unstubAllEnvs();
  });

  it("throws DatabaseConfigurationError when DATABASE_URL is not configured", async () => {
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_URL_UNPOOLED;

    const prismaModule = await import("@/lib/prisma");

    expect(() => prismaModule.getPrismaClient()).toThrow(prismaModule.DatabaseConfigurationError);
  });

  it("returns a fresh client after __resetPrismaClientForTests clears cached state", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/dentpro_test";

    const prismaModule = await import("@/lib/prisma");

    const first = prismaModule.getPrismaClient();
    const second = prismaModule.getPrismaClient();
    expect(second).toBe(first);

    prismaModule.__resetPrismaClientForTests();

    const third = prismaModule.getPrismaClient();
    expect(third).not.toBe(first);
  });
});

describe("isDatabaseUnavailableError", () => {
  beforeEach(() => {
    resetEnv();
    vi.resetModules();
  });

  it("returns true for DatabaseCircuitOpenError instances", async () => {
    const prismaModule = await import("@/lib/prisma");

    expect(prismaModule.isDatabaseUnavailableError(new prismaModule.DatabaseCircuitOpenError(1000))).toBe(true);
  });

  it("returns false for unrelated errors", async () => {
    const prismaModule = await import("@/lib/prisma");

    expect(prismaModule.isDatabaseUnavailableError(new Error("boom"))).toBe(false);
    expect(prismaModule.isDatabaseUnavailableError(new prismaModule.DatabaseConfigurationError("boom"))).toBe(false);
  });
});
