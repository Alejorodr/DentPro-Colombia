#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const runCommand = (command, args, envOverrides = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...envOverrides },
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

const runPrisma = async (args, envOverrides) => runCommand('pnpm', ['exec', 'prisma', ...args], envOverrides);

const listMigrationDirectories = async () => {
  const migrationsPath = path.join(repoRoot, 'prisma', 'migrations');
  const entries = await readdir(migrationsPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
};

const isP3005Error = ({ stderr }) => /P3005/i.test(stderr || '');

// P3009: pre-existing failed migration blocking new migrations
const isP3009Error = ({ stderr }) => /P3009/i.test(stderr || '');

// P3018: migration failed to apply during this deploy attempt
const isP3018Error = ({ stderr }) => /P3018/i.test(stderr || '');

const isAdvisoryLockTimeoutError = ({ stderr }) => {
  const output = stderr || '';
  return /P1002/i.test(output) || /advisory lock/i.test(output) || /pg_advisory_lock/i.test(output);
};

// Extract migration name from P3009 error: `migration_name` migration started at ... failed
const extractP3009MigrationName = ({ stderr }) => {
  const match = (stderr || '').match(/`([^`]+)`\s+migration started at .+ failed/);
  return match ? match[1] : null;
};

// Extract migration name from P3018 error: Migration name: migration_name
const extractP3018MigrationName = ({ stderr }) => {
  const match = (stderr || '').match(/Migration name:\s*(\S+)/);
  return match ? match[1] : null;
};

const resolveApplied = async (migrationName, databaseUrl) => {
  logStep(`Marcando migración como applied: ${migrationName}`);
  return runPrisma(
    ['migrate', 'resolve', '--applied', migrationName, '--schema', 'prisma/schema.prisma'],
    { DATABASE_URL: databaseUrl },
  );
};

const deployMigrations = async (databaseUrl) =>
  runPrisma(['migrate', 'deploy', '--schema', 'prisma/schema.prisma'], { DATABASE_URL: databaseUrl });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const deployWithRetry = async (databaseUrl) => {
  const maxAttempts = 3;
  const delaysMs = [15000, 30000, 45000];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    logStep(`Ejecutando migrate deploy (intento ${attempt}/${maxAttempts})`);
    const result = await deployMigrations(databaseUrl);

    if (result.code === 0) {
      return result;
    }

    if (!isAdvisoryLockTimeoutError(result)) {
      return result;
    }

    if (attempt === maxAttempts) {
      return result;
    }

    const waitMs = delaysMs[attempt - 1] ?? delaysMs[delaysMs.length - 1];
    logStep(`Retry por P1002/advisory lock (intento ${attempt + 1}/${maxAttempts})`);
    await sleep(waitMs);
  }

  return { code: 1, stderr: 'Unexpected retry flow termination.' };
};

const baselineMigrations = async () => {
  const migrations = await listMigrationDirectories();

  for (const migration of migrations) {
    logStep(`Marcando migración como aplicada: ${migration}`);
    const result = await runPrisma([
      'migrate',
      'resolve',
      '--applied',
      migration,
      '--schema',
      'prisma/schema.prisma',
    ]);

    if (result.code !== 0) {
      if (result.stderr) {
        console.error(result.stderr);
      }
      throw new Error(`Falló prisma migrate resolve para ${migration}.`);
    }
  }
};

// Resolve failed migrations (P3009/P3018) one by one, marking each as --applied.
// These are legacy SQLite-format migrations that cannot run on PostgreSQL;
// the schema is already present via db push or later migrations.
const deployResolvingFailedMigrations = async (databaseUrl) => {
  const maxResolveAttempts = 30;

  for (let i = 0; i < maxResolveAttempts; i += 1) {
    const result = await deployWithRetry(databaseUrl);

    if (result.code === 0) {
      return result;
    }

    let failedMigration = null;

    if (isP3009Error(result)) {
      failedMigration = extractP3009MigrationName(result);
      if (!failedMigration) {
        return result;
      }
      logStep(`P3009 — resolviendo migración pre-fallida: ${failedMigration}`);
    } else if (isP3018Error(result)) {
      failedMigration = extractP3018MigrationName(result);
      if (!failedMigration) {
        return result;
      }
      logStep(`P3018 — resolviendo migración que falló al aplicar: ${failedMigration}`);
    } else {
      return result;
    }

    const resolveResult = await resolveApplied(failedMigration, databaseUrl);
    if (resolveResult.code !== 0) {
      if (resolveResult.stderr) console.error(resolveResult.stderr);
      return { code: 1, stderr: `Falló resolve --applied para ${failedMigration}.\n${resolveResult.stderr}` };
    }
  }

  return { code: 1, stderr: `Superado límite de ${maxResolveAttempts} resoluciones de migración.` };
};

const isInvalidDatabaseUrl = (value) => {
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
const deriveDirectUrl = (url) => {
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

const run = async () => {
  const isProduction = process.env.VERCEL_ENV === 'production';

  if (!isProduction) {
    logStep('Skip migrate (non-production deployment).');
    return;
  }

  const unpooledUrl = process.env.DATABASE_URL_UNPOOLED;
  const pooledUrl = process.env.DATABASE_URL;

  // Prefer an explicitly-set direct URL; otherwise auto-derive from the pooler URL.
  // prisma migrate deploy uses pg_advisory_lock() which is not supported over pgbouncer.
  const databaseUrl = unpooledUrl || deriveDirectUrl(pooledUrl);
  const selectedConnectionType = unpooledUrl ? 'unpooled (env)' : (databaseUrl !== pooledUrl ? 'direct (auto-derived from pooler)' : 'pooled');
  logStep(`Conexión de migración: ${selectedConnectionType}`);

  if (isInvalidDatabaseUrl(databaseUrl)) {
    throw new Error('DATABASE_URL inválida o placeholder. Configure DATABASE_URL en Vercel.');
  }

  logStep('Ejecutando migraciones Prisma');
  const deployResult = await deployResolvingFailedMigrations(databaseUrl);

  if (deployResult.code === 0) {
    logStep('Migraciones aplicadas o ya al día');
    return;
  }

  if (isP3005Error(deployResult)) {
    logStep('P3005 detectado. Aplicando baseline automático');
    await baselineMigrations();

    const retryResult = await deployWithRetry(databaseUrl);
    if (retryResult.code !== 0) {
      if (retryResult.stderr) {
        console.error(retryResult.stderr);
      }
      throw new Error('Falló prisma migrate deploy luego de baseline.');
    }

    logStep('Migraciones aplicadas o ya al día');
    return;
  }

  if (deployResult.stderr) {
    console.error(deployResult.stderr);
  }
  if (isAdvisoryLockTimeoutError(deployResult)) {
    throw new Error('Falló prisma migrate deploy tras reintentos por P1002/advisory lock.');
  }
  throw new Error('Falló prisma migrate deploy.');
};

run().catch((error) => {
  console.error(`\n[vercel-prisma] ${error.message}`);
  process.exit(1);
});
