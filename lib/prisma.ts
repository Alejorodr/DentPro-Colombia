import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";

import { Prisma, PrismaClient, UserRole } from "@prisma/client";

const FALLBACK_DATABASE_PATH = path.join(
  process.cwd(),
  "prisma",
  ".cache",
  "dentpro-fallback.db",
);

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

async function applyFallbackSchema(prisma: PrismaClient) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "primary_role_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_primary_role_id_check" CHECK ("primary_role_id" IN ('patient', 'professional', 'reception', 'admin'))
  );`,
    'CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");',
  ];

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
}

type SqlExecutor = PrismaClient | Prisma.TransactionClient;

async function ensureFallbackMigrationsTable(executor: SqlExecutor) {
  await executor.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_fallback_migrations" (
      "name" TEXT PRIMARY KEY,
      "applied_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function applyPendingMigrations(prisma: PrismaClient): Promise<boolean> {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  let entries: fs.Dirent[] = [];

  try {
    entries = await fsp.readdir(migrationsDir, { withFileTypes: true });
  } catch (error) {
    const maybeErrno = error as NodeJS.ErrnoException;

    if (maybeErrno?.code === "ENOENT") {
      console.warn(
        "No se encontró el directorio de migraciones. Aplicando esquema mínimo incorporado.",
      );
      await applyFallbackSchema(prisma);
      await ensureFallbackMigrationsTable(prisma);
      return true;
    }

    console.warn("No se pudo leer el directorio de migraciones", error);
    return false;
  }

  await ensureFallbackMigrationsTable(prisma);

  const appliedMigrations = new Set(
    (
      (await prisma.$queryRaw<Array<{ name: string }>>`
        SELECT "name" FROM "_fallback_migrations"
      `) ?? []
    ).map((row) => row.name),
  );

  const migrationDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (migrationDirs.length === 0) {
    console.warn(
      "No se encontraron migraciones en el directorio. Aplicando esquema mínimo incorporado.",
    );
    await applyFallbackSchema(prisma);
    return true;
  }

  let appliedAny = false;

  for (const directory of migrationDirs) {
    if (appliedMigrations.has(directory)) {
      continue;
    }

    const migrationPath = path.join(migrationsDir, directory, "migration.sql");
    try {
      const sql = await fsp.readFile(migrationPath, "utf8");
      const statements = splitSqlStatements(sql);
      await prisma.$transaction(async (tx) => {
        await ensureFallbackMigrationsTable(tx);
        for (const statement of statements) {
          await tx.$executeRawUnsafe(statement);
        }
        await tx.$executeRaw`
          INSERT INTO "_fallback_migrations" ("name")
          VALUES (${directory})
        `;
      });
      appliedAny = true;
    } catch (error) {
      console.error(`No se pudo aplicar la migración ${directory}`, error);
      throw error;
    }
  }

  return appliedAny;
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
    await applyPendingMigrations(prisma);

    const usersTableResult =
      (await prisma.$queryRawUnsafe<Array<{ count: number | bigint }>>(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='users'",
      )) ?? [];

    const usersTableCount = Number(usersTableResult.at(0)?.count ?? 0);

    if (Number.isFinite(usersTableCount) && usersTableCount > 0) {
      await ensureAdminUser(prisma);
    }
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
