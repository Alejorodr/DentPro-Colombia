import { describe, expect, it, vi } from "vitest";

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

describe("POST /api/auth/login", () => {
  it("authenticates the bundled admin user with the published credentials", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      AUTH_JWT_SECRET: "test-secret-key",
      NODE_ENV: "test",
    };

    await resetAuthState();
    await removeFallbackDatabase();

    try {
      vi.resetModules();
      vi.doMock("jose", async (importOriginal) => {
        const actual = await importOriginal<typeof import("jose")>();

        class MockSignJWT {
          constructor(private readonly payload: Record<string, unknown>) {}

          setProtectedHeader() {
            return this;
          }

          setIssuedAt() {
            return this;
          }

          setExpirationTime() {
            return this;
          }

          async sign() {
            return `${JSON.stringify(this.payload)}.mock-signature`;
          }
        }

        return { ...actual, SignJWT: MockSignJWT as unknown as typeof actual.SignJWT };
      });

      const { POST } = await import("@/app/api/auth/login/route");

      const response = await POST(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "admin@dentpro.co", password: "R00t&4ss" }),
        }),
      );

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body).toMatchObject({
        ok: true,
        user: {
          email: "admin@dentpro.co",
          role: "admin",
        },
      });

      const authCookie = response.cookies.get("auth_token");
      expect(authCookie?.value).toBeDefined();
    } finally {
      vi.resetModules();
      vi.doUnmock("jose");
      await resetAuthState();
      await removeFallbackDatabase();
      process.env = { ...ORIGINAL_ENV };
    }
  });
});
