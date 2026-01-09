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

const nonEmptySchemaError = 'non_empty_schema';

const runPrismaOrThrow = async (args, { env, input, errorMessage } = {}) => {
  const result = await runCommand('npx', prismaArgs(...args), { env, input });

  if (result.code !== 0) {
    if (result.stderr) {
      console.error(result.stderr);
    }
    throw new Error(errorMessage || 'Falló la ejecución de Prisma.');
  }

  return result;
};

const isDatabaseEmpty = async (url) => {
  logStep('Comprobando si la base de datos está vacía...');

  const sql = `DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  ) THEN
    RAISE EXCEPTION '${nonEmptySchemaError}';
  END IF;
END $$;\n`;

  const result = await runCommand(
    'npx',
    prismaArgs('db', 'execute', '--stdin', '--url', url),
    {
      env: prismaEnv(url),
      input: sql,
    }
  );

  if (result.code === 0) {
    logStep('No se encontraron tablas de usuario.');
    return true;
  }

  if (result.stderr.includes(nonEmptySchemaError)) {
    logStep('Se encontraron tablas de usuario en la base de datos.');
    return false;
  }

  console.error(result.stderr);
  throw new Error(
    'No se pudo determinar si la base de datos está vacía. Revisa los logs anteriores.'
  );
};

const listMigrationDirectories = async () => {
  const migrationsPath = path.join(process.cwd(), 'prisma', 'migrations');
  const entries = await readdir(migrationsPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
};

const run = async () => {
  const databaseUrl =
    process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'Se requiere DATABASE_URL o DATABASE_URL_UNPOOLED para ejecutar migraciones en Vercel.'
    );
  }

  const env = prismaEnv(databaseUrl);
  const isEmpty = await isDatabaseEmpty(databaseUrl);

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

  logStep('Validando equivalencia entre la base y las migraciones...');
  const diffResult = await runCommand(
    'npx',
    prismaArgs(
      'migrate',
      'diff',
      '--from-migrations',
      'prisma/migrations',
      '--to-url',
      databaseUrl,
      '--exit-code'
    ),
    { env }
  );

  if (diffResult.code === 0) {
    logStep('La base está alineada con las migraciones. Baselineando...');
    const migrations = await listMigrationDirectories();

    for (const migration of migrations) {
      logStep(`Marcando migración como aplicada: ${migration}`);
      await runPrismaOrThrow(['migrate', 'resolve', '--applied', migration], {
        env,
        errorMessage: `Falló prisma migrate resolve para ${migration}.`,
      });
    }

    logStep('Ejecutando prisma migrate deploy tras el baseline...');
    await runPrismaOrThrow(['migrate', 'deploy'], {
      env,
      errorMessage: 'Falló prisma migrate deploy después del baseline.',
    });

    logStep('Generando Prisma Client...');
    await runPrismaOrThrow(['generate'], {
      env,
      errorMessage: 'Falló prisma generate.',
    });
    return;
  }

  if (diffResult.code === 2) {
    console.error(diffResult.stderr);
    throw new Error(
      'Se detectó drift entre la base de datos y las migraciones. Debes usar una base vacía o alinear la base manualmente antes de desplegar.'
    );
  }

  console.error(diffResult.stderr);
  throw new Error('No se pudo validar el estado de las migraciones.');
};

run().catch((error) => {
  console.error(`\n[vercel-prisma] ${error.message}`);
  process.exit(1);
});
