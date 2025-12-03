import { describe, expect, it, vi } from "vitest";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const ORIGINAL_ENV = { ...process.env };

async function resetAuthState() {
  const [{ __resetAuthJwtSecretForTests }, { __resetPrismaClientForTests }] = await Promise.all([
    import("@/lib/auth/jwt"),
    import("@/lib/prisma"),
  ]);

  __resetAuthJwtSecretForTests();
  __resetPrismaClientForTests();
}

async function removeFallbackDatabase() {
  const prismaModule = await import("@/lib/prisma");
  const fallbackPath = prismaModule.__getFallbackDatabasePathForTests();
  const fs = await import("node:fs/promises");
  await fs.rm(fallbackPath, { force: true });
}

describe("Auth.js credentials provider", () => {
  it("authorizes the bundled admin user with valid credentials", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      AUTH_SECRET: "test-secret-key",
      NODE_ENV: "test",
    };

    await resetAuthState();
    await removeFallbackDatabase();

    try {
      vi.resetModules();

      const credentialsProvider = authOptions.providers.find((provider) => provider.id === "credentials");
      expect(credentialsProvider?.authorize).toBeDefined();

      const user = await credentialsProvider?.authorize?.(
        { email: "admin@dentpro.co", password: "R00t&4ss" },
        undefined as any,
      );

      expect(user).toMatchObject({
        email: "admin@dentpro.co",
        role: "admin",
      });
    } finally {
      vi.resetModules();
      await resetAuthState();
      await removeFallbackDatabase();
      process.env = { ...ORIGINAL_ENV };
    }
  });
});
