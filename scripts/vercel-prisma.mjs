#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const prismaArgs = (...args) => ['--yes', 'prisma', ...args];

const runCommand = (command, args, { env, input } = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
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

    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });

const logStep = (message) => {
  console.log(`\n[vercel-prisma] ${message}`);
};

const prismaEnv = (url) => ({
  ...process.env,
  DATABASE_URL: url,
});

const runPrismaOrThrow = async (
  args,
  { env, input, errorMessage } = {}
) => {
  const result = await runCommand('npx', prismaArgs(...args), { env, input });

  if (result.code !== 0) {
    if (result.stderr) {
      console.error(result.stderr);
    }
    throw new Error(errorMessage || 'Falló la ejecución de Prisma.');
  }

  return result;
};

const parseTableNames = (stdout) =>
  stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.endsWith('|'))
    .map((line) => line.slice(1, -1).trim())
    .filter((name) => name && name !== 'tablename');

const getTableNames = async (url) => {
  logStep('Consultando tablas en la base de datos...');

  const sql = `SELECT tablename FROM pg_tables WHERE schemaname='public';\n`;

  const result = await runCommand(
    'npx',
    prismaArgs('db', 'execute', '--stdin', '--url', url),
    {
      env: prismaEnv(url),
      input: sql,
    }
  );

  if (result.code !== 0) {
    if (result.stderr) {
      console.error(result.stderr);
    }
    throw new Error(
      'No se pudo consultar el estado de la base de datos. Revisa los logs anteriores.'
    );
  }

  const tables = parseTableNames(result.stdout);
  logStep(
    tables.length
      ? `Tablas encontradas: ${tables.join(', ')}`
      : 'No se encontraron tablas en la base de datos.'
  );
  return tables;
};

const listMigrationDirectories = async () => {
  const migrationsPath = path.join(process.cwd(), 'prisma', 'migrations');
  const entries = await readdir(migrationsPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
};

const baselineMigrations = async (env) => {
  const migrations = await listMigrationDirectories();

  if (!migrations.length) {
    logStep('No se encontraron migraciones para baselinear.');
    return;
  }

  for (const migration of migrations) {
    logStep(`Marcando migración como aplicada: ${migration}`);
    await runPrismaOrThrow(['migrate', 'resolve', '--applied', migration], {
      env,
      errorMessage: `Falló prisma migrate resolve para ${migration}.`,
    });
  }
};

const run = async () => {
  const databaseUrl =
    process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'Se requiere DATABASE_URL o DATABASE_URL_UNPOOLED para ejecutar migraciones en Vercel.'
    );
  }

  const env = prismaEnv(databaseUrl);
  const tables = await getTableNames(databaseUrl);
  const hasPrismaMigrations = tables.includes('_prisma_migrations');
  const userTables = tables.filter((table) => table !== '_prisma_migrations');
  const isEmpty = userTables.length === 0;

  if (isEmpty) {
    logStep('Base de datos vacía. Ejecutando prisma migrate deploy...');
    await runPrismaOrThrow(['migrate', 'deploy'], {
      env,
      errorMessage: 'Falló prisma migrate deploy en base vacía.',
    });

    logStep('Generando Prisma Client...');
    await runPrismaOrThrow(['generate'], {
      env,
      errorMessage: 'Falló prisma generate.',
    });
    return;
  }

  if (shadowDatabaseUrl) {
    logStep(
      'Validando equivalencia entre la base y las migraciones (shadow DB)...'
    );
    const diffResult = await runCommand(
      'npx',
      prismaArgs(
        'migrate',
        'diff',
        '--from-migrations',
        'prisma/migrations',
        '--to-url',
        databaseUrl,
        '--shadow-database-url',
        shadowDatabaseUrl,
        '--exit-code'
      ),
      { env }
    );

    if (diffResult.code !== 0) {
      if (diffResult.stderr) {
        console.error(diffResult.stderr);
      }
      throw new Error(
        'Se detectó drift entre la base de datos y las migraciones. Debes alinear la base antes de desplegar.'
      );
    }

    logStep('La base está alineada con las migraciones.');
  } else {
    logStep(
      'No se configuró SHADOW_DATABASE_URL. Se omite la validación de drift.'
    );
  }

  if (!hasPrismaMigrations) {
    if (!shadowDatabaseUrl) {
      console.warn(
        '\n[vercel-prisma] WARNING: No hay SHADOW_DATABASE_URL. No se puede validar drift. Se aplicará baseline best-effort.'
      );
    } else {
      logStep('No se encontró _prisma_migrations. Baselineando...');
    }
    await baselineMigrations(env);
  }

  logStep('Ejecutando prisma migrate deploy...');
  await runPrismaOrThrow(['migrate', 'deploy'], {
    env,
    errorMessage: 'Falló prisma migrate deploy.',
  });

  logStep('Generando Prisma Client...');
  await runPrismaOrThrow(['generate'], {
    env,
    errorMessage: 'Falló prisma generate.',
  });
};

run().catch((error) => {
  console.error(`\n[vercel-prisma] ${error.message}`);
  process.exit(1);
});
