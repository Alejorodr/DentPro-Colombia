import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

const explicitDatabaseUrl = process.env.DATABASE_URL;
const explicitDatabaseUrlUnpooled = process.env.DATABASE_URL_UNPOOLED;
const explicitShadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

// Next.js loads .env then .env.local (with .env.local taking priority) automatically,
// but bare `npx prisma ...` invocations only go through this file — dotenv's default
// `dotenv/config` import only reads `.env`, which this repo doesn't have, so it silently
// fell back to the localhost default below. Mirror Next.js's precedence explicitly.
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

if (explicitDatabaseUrl !== undefined) {
  process.env.DATABASE_URL = explicitDatabaseUrl;
}

if (explicitDatabaseUrlUnpooled !== undefined) {
  process.env.DATABASE_URL_UNPOOLED = explicitDatabaseUrlUnpooled;
}

if (explicitShadowDatabaseUrl !== undefined) {
  process.env.SHADOW_DATABASE_URL = explicitShadowDatabaseUrl;
}

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
const shadowDatabaseUrl = fallbackDatabaseUrl.startsWith("file:") ? undefined : process.env.SHADOW_DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Para deploy (migrate deploy) necesita SI o SI una url aquí:
    url: fallbackDatabaseUrl,
    // Scratch database for `migrate dev`'s shadow diffing: Prisma wipes it on
    // every run, so it must never be the real dev/prod database. Locally it is
    // the `prisma_shadow` database on Neon's Dev branch, next to the `neondb`
    // database that DATABASE_URL uses (DOG-41). Neon's pooled connection can't
    // CREATE DATABASE, so the shadow database has to exist beforehand.
    shadowDatabaseUrl,
  },
});
