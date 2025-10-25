import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

async function removeFallbackDatabase() {
  const prismaModule = await import("@/lib/prisma");
  const fallbackPath = prismaModule.__getFallbackDatabasePathForTests();
  await fs.rm(fallbackPath, { force: true });
}

describe("resolveDatabaseUrl", () => {
  it("returns the configured DATABASE_URL when it points to an existing SQLite file", async () => {
    vi.resetModules();
    const customDbRelativePath = "./custom.db";
    const customDbAbsolutePath = path.join(process.cwd(), customDbRelativePath);
    await fs.writeFile(customDbAbsolutePath, "");
    process.env = { ...ORIGINAL_ENV, DATABASE_URL: `file:${customDbRelativePath}` };

    const prismaModule = await import("@/lib/prisma");

    expect(prismaModule.resolveDatabaseUrl()).toBe(`file:${customDbRelativePath}`);

    prismaModule.__resetPrismaClientForTests();
    await fs.rm(customDbAbsolutePath, { force: true });
    process.env = { ...ORIGINAL_ENV };
  });

  it("falls back to the bundled prisma database when DATABASE_URL is missing", async () => {
    vi.resetModules();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await removeFallbackDatabase();
    const expected = `file:${path.join(tmpdir(), "dentpro-colombia", "dentpro-fallback.db")}`;
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

  it("falls back to the bundled prisma database when the configured SQLite file is missing", async () => {
    vi.resetModules();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await removeFallbackDatabase();
    const expected = `file:${path.join(tmpdir(), "dentpro-colombia", "dentpro-fallback.db")}`;
    const missingRelativePath = "./nonexistent.db";
    const missingAbsolutePath = path.join(process.cwd(), missingRelativePath);
    await fs.rm(missingAbsolutePath, { force: true });
    process.env = { ...ORIGINAL_ENV, DATABASE_URL: `file:${missingRelativePath}` };

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
