import Database from "better-sqlite3";
import type { Database as BetterSqlite3Database } from "better-sqlite3";
import path from "path";

const globalForDb = globalThis as unknown as {
  dentproDb?: BetterSqlite3Database;
};

function createDatabase(): BetterSqlite3Database {
  const filePath = process.env.AUTH_DATABASE_URL ?? path.join(process.cwd(), "dentpro.db");
  const database = new Database(filePath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  return database;
}

export const db = globalForDb.dentproDb ?? (globalForDb.dentproDb = createDatabase());

export type DatabaseClient = typeof db;
