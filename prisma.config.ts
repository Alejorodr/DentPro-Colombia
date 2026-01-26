import "dotenv/config";
import { defineConfig } from "prisma/config";

const resolvedDatabaseUrl = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";

if (!resolvedDatabaseUrl) {
  if (isProduction) {
    throw new Error("Missing DATABASE_URL");
  }
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres";
}

const fallbackDatabaseUrl =
  resolvedDatabaseUrl ?? process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/postgres";

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
