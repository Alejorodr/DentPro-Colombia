import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";

const ORIGINAL_ENV = { ...process.env };

async function removeFallbackDatabase() {
  const prismaModule = await import("@/lib/prisma");
  const fallbackPath = prismaModule.__getFallbackDatabasePathForTests();
  await fs.rm(fallbackPath, { force: true });
}

describe("resolveDatabaseUrl", () => {
  it("returns the configured DATABASE_URL when it is set", async () => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV, DATABASE_URL: "file:./custom.db" };

    const prismaModule = await import("@/lib/prisma");

    expect(prismaModule.resolveDatabaseUrl()).toBe("file:./custom.db");

    prismaModule.__resetPrismaClientForTests();
    process.env = { ...ORIGINAL_ENV };
  });

  it("falls back to the bundled prisma database when DATABASE_URL is missing", async () => {
    vi.resetModules();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await removeFallbackDatabase();
    const expected = `file:${path.join(process.cwd(), "prisma", ".cache", "dentpro-fallback.db")}`;
    process.env = { ...ORIGINAL_ENV };
    delete process.env.DATABASE_URL;

    const prismaModule = await import("@/lib/prisma");

    expect(prismaModule.resolveDatabaseUrl()).toBe(expected);
    expect(process.env.DATABASE_URL).toBe(expected);
    expect(warnSpy).toHaveBeenCalled();

    prismaModule.__resetPrismaClientForTests();
    await removeFallbackDatabase();
    process.env = { ...ORIGINAL_ENV };
    warnSpy.mockRestore();
  });
});

describe("fallback bootstrap", () => {
  it("applies the bundled schema when migrations are missing", async () => {
    vi.resetModules();

    const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
    const migrationsBackupDir = `${migrationsDir}.test-backup`;
    await fs.rm(migrationsBackupDir, { recursive: true, force: true });
    await fs.rename(migrationsDir, migrationsBackupDir);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const previousEnv = { ...process.env };
    process.env = { ...ORIGINAL_ENV };
    delete process.env.DATABASE_URL;

    let prismaModule: typeof import("@/lib/prisma") | null = null;
    let prisma: import("@prisma/client").PrismaClient | null = null;

    try {
      await removeFallbackDatabase();

      prismaModule = await import("@/lib/prisma");
      prisma = prismaModule.getPrismaClient();

      await prismaModule.ensureFallbackDatabaseReady();

      const admin = await prisma.user.findUnique({
        where: { email: "admin@dentpro.co" },
      });

      expect(admin).not.toBeNull();
      expect(admin?.primaryRole).toBe("admin");
      expect(bcrypt.compareSync("R00t&4ss", admin!.passwordHash)).toBe(true);
    } finally {
      await prisma?.$disconnect().catch(() => {});
      prismaModule?.__resetPrismaClientForTests();
      await removeFallbackDatabase();
      process.env = { ...previousEnv };
      warnSpy.mockRestore();
      const backupExists = await fs
        .stat(migrationsBackupDir)
        .then(() => true)
        .catch(() => false);

      if (backupExists) {
        await fs.rename(migrationsBackupDir, migrationsDir);
      }
    }
  });
});
