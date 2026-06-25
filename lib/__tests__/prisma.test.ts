import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";

const ORIGINAL_ENV = { ...process.env };
const HAS_DATABASE_URL = Boolean(process.env.DATABASE_URL);

async function removeFallbackDatabase() {
  const prismaModule = await import("@/lib/prisma");
  const fallbackPath = prismaModule.__getFallbackDatabasePathForTests();
  if (!HAS_DATABASE_URL) {
    await fs.rm(fallbackPath, { force: true });
  }
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

const fallbackSuite = describe.skip;

const describeFallback = HAS_DATABASE_URL ? fallbackSuite : describe;

describeFallback("fallback bootstrap", () => {
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

  it("applies newly added migrations when bootstrapping again", async () => {
    vi.resetModules();

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const previousEnv = { ...process.env };
    process.env = { ...ORIGINAL_ENV };
    delete process.env.DATABASE_URL;

    const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
    const syntheticMigrationName = "99999999999999_synthetic_test";
    const syntheticMigrationDir = path.join(migrationsDir, syntheticMigrationName);

    let prismaModule: typeof import("@/lib/prisma") | null = null;
    let prisma: import("@prisma/client").PrismaClient | null = null;

    try {
      await removeFallbackDatabase();
      await fs.rm(syntheticMigrationDir, { recursive: true, force: true });

      prismaModule = await import("@/lib/prisma");
      prisma = prismaModule.getPrismaClient();
      await prismaModule.ensureFallbackDatabaseReady();
      await prisma.$disconnect();
      prismaModule.__resetPrismaClientForTests();
      prisma = null;
      prismaModule = null;

      await fs.mkdir(syntheticMigrationDir, { recursive: true });
      await fs.writeFile(
        path.join(syntheticMigrationDir, "migration.sql"),
        'CREATE TABLE IF NOT EXISTS "synthetic_table" ( "id" INTEGER PRIMARY KEY AUTOINCREMENT );\n',
      );

      vi.resetModules();
      prismaModule = await import("@/lib/prisma");
      prisma = prismaModule.getPrismaClient();
      await prismaModule.ensureFallbackDatabaseReady();

      const syntheticTable = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='synthetic_table';",
      );

      expect(syntheticTable).toHaveLength(1);
    } finally {
      await prisma?.$disconnect().catch(() => {});
      prismaModule?.__resetPrismaClientForTests();
      await fs.rm(syntheticMigrationDir, { recursive: true, force: true });
      await removeFallbackDatabase();
      process.env = { ...previousEnv };
      warnSpy.mockRestore();
    }
  });
});
