#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const runCommand = (command, args, envOverrides = {}, env = process.env) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...env, ...envOverrides },
    });

    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      resolve({ code, stderr });
    });
  });

const logStep = (message) => {
  console.log(`\n[vercel-prisma] ${message}`);
};

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// P3005: the database schema is not empty but has no migration history.
export const isP3005Error = ({ stderr }) => /P3005/i.test(stderr || '');

// P3009: pre-existing failed migration blocking new migrations.
export const isP3009Error = ({ stderr }) => /P3009/i.test(stderr || '');

// P3018: migration failed to apply during this deploy attempt.
export const isP3018Error = ({ stderr }) => /P3018/i.test(stderr || '');

export const isAdvisoryLockTimeoutError = ({ stderr }) => {
  const output = stderr || '';
  return /P1002/i.test(output) || /advisory lock/i.test(output) || /pg_advisory_lock/i.test(output);
};

// Extract migration name from P3009 error: `migration_name` migration started at ... failed
export const extractP3009MigrationName = ({ stderr }) => {
  const match = (stderr || '').match(/`([^`]+)`\s+migration started at .+ failed/);
  return match ? match[1] : null;
};

// Extract migration name from P3018 error: Migration name: migration_name
export const extractP3018MigrationName = ({ stderr }) => {
  const match = (stderr || '').match(/Migration name:\s*(\S+)/);
  return match ? match[1] : null;
};

/*
 * Historical note (why there is no automatic `migrate resolve --applied` anymore):
 *
 * Commits 98bbb86 / f963bed / a2fec0a (June 2026) added a loop that marked every
 * P3009/P3018 migration as applied, because the legacy SQLite-flavoured migrations
 * (e.g. 20250121120000_init_users, 20251127232542_add_appointments) could not run on
 * Postgres. Commit 0c96089 (2026-08-19) squashed those 28 legacy folders into
 * 20260819000000_baseline and removed their orphaned rows from _prisma_migrations.
 * Since then no legacy migration exists in prisma/migrations, so there is nothing that
 * can legitimately be auto-resolved. Silently marking a failed migration as applied
 * hides real failures (e.g. 20261121120000_protect_clinical_records) and lets the
 * deployment ship with a schema that does not match the code, so any failed migration
 * must now fail the build and be resolved manually.
 */

const describeFailedMigration = (result) => {
  if (isP3009Error(result)) {
    return { code: 'P3009', name: extractP3009MigrationName(result) };
  }
  if (isP3018Error(result)) {
    return { code: 'P3018', name: extractP3018MigrationName(result) };
  }
  return null;
};

export const failedMigrationInstructions = ({ code, name }) => {
  const label = name ?? '<nombre_de_la_migracion>';
  return [
    `${code}: la migración ${label} falló. El build se detiene para no desplegar código contra un esquema inconsistente.`,
    'Pasos para resolverlo manualmente (fuera del build, con acceso directo a la base):',
    '  1. Revisa el error de Prisma arriba y el estado real: pnpm exec prisma migrate status --schema prisma/schema.prisma',
    '  2. Corrige la causa (SQL de la migración o datos que la bloquean).',
    `  3. Si los cambios NO quedaron aplicados: pnpm exec prisma migrate resolve --rolled-back ${label} --schema prisma/schema.prisma`,
    `     Si verificaste que el esquema SÍ quedó aplicado por completo: pnpm exec prisma migrate resolve --applied ${label} --schema prisma/schema.prisma`,
    '  4. Vuelve a desplegar.',
  ].join('\n');
};

export const baselineInstructions = () =>
  [
    'P3005: la base de datos tiene esquema pero no tiene historial de migraciones (_prisma_migrations).',
    'El baseline automático fue eliminado: marcar todas las migraciones como aplicadas sin verificar puede ocultar diferencias reales de esquema.',
    'Baseline manual (una sola vez, fuera del build, con acceso directo a la base):',
    '  1. Compara el esquema real con el del repositorio:',
    '     DATABASE_URL="<url directa (unpooled)>" pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script',
    '  2. Si no hay diferencias, marca como aplicada cada migración de prisma/migrations, en orden:',
    '     pnpm exec prisma migrate resolve --applied <migracion> --schema prisma/schema.prisma',
    '  3. Verifica con: pnpm exec prisma migrate status --schema prisma/schema.prisma',
    '  4. Vuelve a desplegar.',
  ].join('\n');

export const isInvalidDatabaseUrl = (value) => {
  if (!value || value.trim() === '') {
    return true;
  }
  const normalized = value.trim();
  if (!normalized.startsWith('postgres://') && !normalized.startsWith('postgresql://')) {
    return true;
  }
  return normalized.includes('HOST:5432') || normalized.includes('USER:PASSWORD');
};

// Neon pooled URLs contain "-pooler" in the hostname; advisory locking requires a direct connection.
// If DATABASE_URL_UNPOOLED is not set, strip "-pooler" from the hostname automatically.
export const deriveDirectUrl = (url) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('-pooler.')) {
      parsed.hostname = parsed.hostname.replace('-pooler.', '.');
      return parsed.toString();
    }
  } catch {
    // not a valid URL — fall through
  }
  return url;
};

export const run = async ({ env = process.env, sleep = defaultSleep } = {}) => {
  const runPrisma = (args, envOverrides) => runCommand('pnpm', ['exec', 'prisma', ...args], envOverrides, env);

  const deployMigrations = (databaseUrl) =>
    runPrisma(['migrate', 'deploy', '--schema', 'prisma/schema.prisma'], { DATABASE_URL: databaseUrl });

  const deployWithRetry = async (databaseUrl) => {
    const maxAttempts = 3;
    const delaysMs = [15000, 30000, 45000];

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      logStep(`Ejecutando migrate deploy (intento ${attempt}/${maxAttempts})`);
      const result = await deployMigrations(databaseUrl);

      if (result.code === 0 || !isAdvisoryLockTimeoutError(result) || attempt === maxAttempts) {
        return result;
      }

      const waitMs = delaysMs[attempt - 1] ?? delaysMs[delaysMs.length - 1];
      logStep(`Retry por P1002/advisory lock (intento ${attempt + 1}/${maxAttempts})`);
      await sleep(waitMs);
    }

    return { code: 1, stderr: 'Unexpected retry flow termination.' };
  };

  const isProduction = env.VERCEL_ENV === 'production';

  if (!isProduction) {
    logStep('Skip migrate (non-production deployment).');
    return;
  }

  const unpooledUrl = env.DATABASE_URL_UNPOOLED;
  const pooledUrl = env.DATABASE_URL;

  // Prefer an explicitly-set direct URL; otherwise auto-derive from the pooler URL.
  // prisma migrate deploy uses pg_advisory_lock() which is not supported over pgbouncer.
  const databaseUrl = unpooledUrl || deriveDirectUrl(pooledUrl);
  const selectedConnectionType = unpooledUrl
    ? 'unpooled (env)'
    : databaseUrl !== pooledUrl
      ? 'direct (auto-derived from pooler)'
      : 'pooled';
  logStep(`Conexión de migración: ${selectedConnectionType}`);

  if (isInvalidDatabaseUrl(databaseUrl)) {
    throw new Error('DATABASE_URL inválida o placeholder. Configure DATABASE_URL en Vercel.');
  }

  logStep('Ejecutando migraciones Prisma');
  const deployResult = await deployWithRetry(databaseUrl);

  if (deployResult.code === 0) {
    logStep('Migraciones aplicadas o ya al día');
    return;
  }

  if (deployResult.stderr) {
    console.error(deployResult.stderr);
  }

  if (isP3005Error(deployResult)) {
    throw new Error(baselineInstructions());
  }

  const failedMigration = describeFailedMigration(deployResult);
  if (failedMigration) {
    throw new Error(failedMigrationInstructions(failedMigration));
  }

  if (isAdvisoryLockTimeoutError(deployResult)) {
    throw new Error('Falló prisma migrate deploy tras reintentos por P1002/advisory lock.');
  }
  throw new Error('Falló prisma migrate deploy.');
};

// Returns the process exit code instead of exiting, so it can be unit-tested.
export const main = async (options) => {
  try {
    await run(options);
    return 0;
  } catch (error) {
    console.error(`\n[vercel-prisma] ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
};

const isDirectInvocation = () => {
  if (!process.argv[1]) return false;
  try {
    return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
};

if (isDirectInvocation()) {
  main().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
