import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  var __prisma: PrismaClient | undefined;
  var __prismaPool: Pool | undefined;
}

let prismaClient: PrismaClient | null = null;

function makeClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool =
    globalThis.__prismaPool ??
    new Pool({
      connectionString: databaseUrl,
      // Neon pooled connections may require relaxed TLS in some environments.
      // Prefer DATABASE_URL with sslmode=verify-full and remove this override if possible.
      ssl: { rejectUnauthorized: false },
    });

  const adapter = new PrismaPg(pool);

  if (process.env.NODE_ENV !== "production") {
    globalThis.__prismaPool = pool;
  }

  return new PrismaClient({ adapter });
}

export function getPrismaClient(): PrismaClient {
  if (globalThis.__prisma) {
    return globalThis.__prisma;
  }

  if (!prismaClient) {
    prismaClient = makeClient();
  }

  if (process.env.NODE_ENV !== "production") {
    globalThis.__prisma = prismaClient;
  }

  return prismaClient;
}

export function __resetPrismaClientForTests() {
  if (globalThis.__prisma) {
    void globalThis.__prisma.$disconnect().catch(() => {
      /* noop */
    });
  }

  if (globalThis.__prismaPool) {
    void globalThis.__prismaPool.end().catch(() => {
      /* noop */
    });
  }

  delete globalThis.__prisma;
  delete globalThis.__prismaPool;
  prismaClient = null;
}

export { PrismaClient };
