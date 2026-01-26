import "dotenv/config";
import { defineConfig } from "prisma/config";

const resolvedDatabaseUrl =
  process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
const isProduction =
  process.env.VERCEL_ENV === "production" ||
  process.env.NODE_ENV === "production";

if (!resolvedDatabaseUrl && isProduction) {
  throw new Error("DATABASE_URL faltante en Vercel.");
}

const fallbackDatabaseUrl =
  resolvedDatabaseUrl ??
  "postgresql://prisma:prisma@localhost:5432/prisma?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Para deploy (migrate deploy) necesita SI o SI una url aquí:
    url: fallbackDatabaseUrl,
  },
});
