import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";

import bcrypt from "bcryptjs";

import { PrismaClient, UserRole } from "@prisma/client";

const FALLBACK_DATABASE_PATH = path.join(tmpdir(), "dentpro-colombia", "dentpro-fallback.db");

const FALLBACK_DATABASE_URL = `file:${FALLBACK_DATABASE_PATH}`;

const FALLBACK_ADMIN_EMAIL = "admin@dentpro.co";
const FALLBACK_ADMIN_NAME = "Ana María Pérez";
const FALLBACK_ADMIN_PASSWORD = "R00t&4ss";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function resolveDatabaseUrl(): string {
  const configuredUrl = process.env.DATABASE_URL?.trim();
  if (configuredUrl) {
    return configuredUrl;
  }

  const fallbackUrl = FALLBACK_DATABASE_URL;

  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "DATABASE_URL is not configured. Generating a local fallback SQLite database for development.",
    );
  }

  process.env.DATABASE_URL = fallbackUrl;
  return fallbackUrl;
}

function splitSqlStatements(sql: string): string[] {
  const sanitized = sql
    .split("\n")
    .map((line) => {
      const trimmed = line.trimStart();
      return trimmed.startsWith("--") ? "" : line;
    })
    .join("\n");

  return sanitized
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function applyPendingMigrations(prisma: PrismaClient) {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  let entries: fs.Dirent[] = [];

  try {
    entries = await fsp.readdir(migrationsDir, { withFileTypes: true });
  } catch (error) {
    console.warn("No se pudo leer el directorio de migraciones", error);
    return;
  }

  const migrationDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const directory of migrationDirs) {
    const migrationPath = path.join(migrationsDir, directory, "migration.sql");
    try {
      const sql = await fsp.readFile(migrationPath, "utf8");
      const statements = splitSqlStatements(sql);
      for (const statement of statements) {
        await prisma.$executeRawUnsafe(statement);
      }
    } catch (error) {
      console.error(`No se pudo aplicar la migración ${directory}`, error);
      throw error;
    }
  }
}

async function ensureAdminUser(prisma: PrismaClient) {
  try {
    const existing = await prisma.user.findUnique({
      where: { email: FALLBACK_ADMIN_EMAIL },
    });

    if (existing) {
      return;
    }
  } catch (error) {
    // Si la tabla no existe todavía, continuamos con el proceso de bootstrap.
  }

  const passwordHash = await bcrypt.hash(FALLBACK_ADMIN_PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: FALLBACK_ADMIN_EMAIL },
    update: { passwordHash, name: FALLBACK_ADMIN_NAME, primaryRole: UserRole.admin },
    create: {
      id: randomUUID(),
      name: FALLBACK_ADMIN_NAME,
      email: FALLBACK_ADMIN_EMAIL,
      passwordHash,
      primaryRole: UserRole.admin,
    },
  });
}

async function bootstrapFallbackDatabase() {
  await fsp.mkdir(path.dirname(FALLBACK_DATABASE_PATH), { recursive: true });

  const prisma = new PrismaClient({
    datasources: { db: { url: FALLBACK_DATABASE_URL } },
  });

  try {
    const tableCountResult =
      (await prisma.$queryRawUnsafe<Array<{ count: number | bigint }>>(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='users'",
      )) ?? [];

    const usersTableCount = Number(tableCountResult.at(0)?.count ?? 0);

    if (!Number.isFinite(usersTableCount) || usersTableCount <= 0) {
      await applyPendingMigrations(prisma);
    }

    await ensureAdminUser(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

let fallbackBootstrapPromise: Promise<void> | null = null;

function createPrismaClient() {
  const databaseUrl = resolveDatabaseUrl();

  if (databaseUrl === FALLBACK_DATABASE_URL) {
    fallbackBootstrapPromise ??= bootstrapFallbackDatabase();
  }

  return new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
}

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

export function __resetPrismaClientForTests() {
  if (globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect().catch(() => {
      /* noop - best effort */
    });
  }

  delete globalForPrisma.prisma;
  fallbackBootstrapPromise = null;
}

export function __getFallbackDatabasePathForTests() {
  return FALLBACK_DATABASE_PATH;
}

export async function ensureFallbackDatabaseReady() {
  if (fallbackBootstrapPromise) {
    await fallbackBootstrapPromise;
  }
}

export { PrismaClient };
