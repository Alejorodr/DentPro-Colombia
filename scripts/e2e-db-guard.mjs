import { config as loadEnv } from "dotenv";

const LOCAL_DB_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "postgres", "db"]);

/**
 * Las E2E siembran usuarios con contraseñas públicas (admin@dentpro.test / Test1234!) y
 * activan bypass de auth. Nunca deben correr contra una base remota (Neon, etc.).
 * Next carga .env/.env.local por su cuenta, así que se evalúa la URL efectiva.
 * Escape explícito para casos excepcionales: E2E_ALLOW_REMOTE_DB=1.
 */
export function resolveEffectiveDatabaseUrl(baseEnv = process.env) {
  const env = { ...baseEnv };
  const fromFiles = {};
  loadEnv({ path: ".env", processEnv: fromFiles, quiet: true });
  loadEnv({ path: ".env.local", processEnv: fromFiles, override: true, quiet: true });
  return env.DATABASE_URL || fromFiles.DATABASE_URL || "";
}

export function getRemoteDatabaseHost(databaseUrl) {
  if (!databaseUrl) return null;
  let host;
  try {
    host = new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    return "<url inválida>";
  }
  if (LOCAL_DB_HOSTS.has(host) || databaseUrl.startsWith("file:")) return null;
  return host;
}

export function assertLocalE2EDatabase(baseEnv = process.env) {
  if (baseEnv.E2E_ALLOW_REMOTE_DB === "1") return;
  const host = getRemoteDatabaseHost(resolveEffectiveDatabaseUrl(baseEnv));
  if (host) {
    console.error(
      `[e2e] Abortado: DATABASE_URL apunta a un host remoto (${host}). Las E2E siembran usuarios de prueba ` +
        "con contraseñas públicas. Usa una base local (docker run -p 5432:5432 postgres:16) y exporta " +
        "DATABASE_URL=postgresql://...@localhost:5432/... antes de correrlas.",
    );
    process.exit(1);
  }
}
