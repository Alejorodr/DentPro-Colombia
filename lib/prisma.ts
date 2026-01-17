import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __prismaPool: Pool | undefined;
}

function makeClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool =
    globalThis.__prismaPool ??
    new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });

  const adapter = new PrismaPg(pool);

  if (process.env.NODE_ENV !== "production") {
    globalThis.__prismaPool = pool;
  }

  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalThis.__prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

export function getPrismaClient(): PrismaClient {
  return prisma;
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
}

export { PrismaClient };
