import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js loads .env then .env.local (with .env.local taking priority) automatically,
// but bare `npx prisma ...` invocations only go through this file — dotenv's default
// `dotenv/config` import only reads `.env`, which this repo doesn't have, so it silently
// fell back to the localhost default below. Mirror Next.js's precedence explicitly.
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const resolvedDatabaseUrl = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
const isProduction = process.env.VERCEL_ENV === "production";

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
