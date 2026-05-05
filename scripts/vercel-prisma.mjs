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

const deployMigrations = async (databaseUrl) =>
  runPrisma(['migrate', 'deploy', '--schema', 'prisma/schema.prisma'], { DATABASE_URL: databaseUrl });


const isAdvisoryLockTimeoutError = ({ stderr }) => {
  const output = stderr || '';
  return /P1002/i.test(output) || /advisory lock/i.test(output) || /pg_advisory_lock/i.test(output);
};

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

const run = async () => {
  const isProduction = process.env.VERCEL_ENV === 'production';

  if (!isProduction) {
    logStep('Skip migrate (non-production deployment).');
    return;
  }

  const unpooledUrl = process.env.DATABASE_URL_UNPOOLED;
  const pooledUrl = process.env.DATABASE_URL;
  const databaseUrl = unpooledUrl || pooledUrl;
  const selectedConnectionType = unpooledUrl ? 'unpooled' : 'pooled';
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
