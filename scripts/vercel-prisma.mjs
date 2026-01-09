#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const prismaArgs = (...args) => ['--yes', 'prisma', ...args];

const runCommand = (command, args, { env } = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });

const logStep = (message) => {
  console.log(`\n[vercel-prisma] ${message}`);
};

const sanitizeUrl = (url) => {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch (error) {
    return 'URL inválida';
  }
};

const prismaEnv = (url) => ({
  ...process.env,
  DATABASE_URL: url,
  DATABASE_URL_UNPOOLED: url,
});

const runPrisma = async (args, env) =>
  runCommand('npx', prismaArgs(...args), { env });

const listMigrationDirectories = async () => {
  const migrationsPath = path.join(process.cwd(), 'prisma', 'migrations');
  const entries = await readdir(migrationsPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
};

const isP3005Error = ({ stderr, stdout }) =>
  /P3005/i.test(stderr || '') || /P3005/i.test(stdout || '');

const deployMigrations = async (env) =>
  runPrisma(
    ['migrate', 'deploy', '--schema', 'prisma/schema.prisma', '--url', env.DATABASE_URL],
    env
  );

const baselineMigrations = async (env) => {
  const migrations = await listMigrationDirectories();

  if (!migrations.length) {
    logStep('No se encontraron migraciones para baselinear.');
    return;
  }

  for (const migration of migrations) {
    logStep(`Marcando migración como aplicada: ${migration}`);
    const result = await runPrisma(
      [
        'migrate',
        'resolve',
        '--applied',
        migration,
        '--schema',
        'prisma/schema.prisma',
        '--url',
        env.DATABASE_URL,
      ],
      env
    );

    if (result.code !== 0) {
      if (result.stderr) {
        console.error(result.stderr);
      }
      throw new Error(`Falló prisma migrate resolve para ${migration}.`);
    }
  }
};

const run = async () => {
  const migrateUrl =
    process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

  if (!migrateUrl) {
    throw new Error(
      'Se requiere DATABASE_URL_UNPOOLED o DATABASE_URL para ejecutar migraciones en Vercel.'
    );
  }

  const env = prismaEnv(migrateUrl);
  logStep(`MIGRATE_URL seleccionado: ${sanitizeUrl(migrateUrl)}`);

  logStep('Ejecutando prisma migrate deploy...');
  const deployResult = await deployMigrations(env);

  if (deployResult.code === 0) {
    logStep('Migraciones aplicadas o ya al día.');
    return;
  }

  if (isP3005Error(deployResult)) {
    logStep('P3005 detectado, aplicando baseline automático.');
    await baselineMigrations(env);

    logStep('Reintentando prisma migrate deploy...');
    const retryResult = await deployMigrations(env);
    if (retryResult.code !== 0) {
      if (retryResult.stderr) {
        console.error(retryResult.stderr);
      }
      throw new Error('Falló prisma migrate deploy luego de baseline.');
    }

    logStep('Migraciones aplicadas o ya al día.');
    return;
  }

  if (deployResult.stderr) {
    console.error(deployResult.stderr);
  }
  throw new Error('Falló prisma migrate deploy.');
};

run().catch((error) => {
  console.error(`\n[vercel-prisma] ${error.message}`);
  process.exit(1);
});
