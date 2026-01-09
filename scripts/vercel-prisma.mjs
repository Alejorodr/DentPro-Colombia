#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
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
  DATABASE_URL_UNPOOLED: url,
});

const runPrisma = async (args, { env, input } = {}) =>
  runCommand('npx', prismaArgs(...args), { env, input });

const runPrismaOrThrow = async (args, { env, input, errorMessage } = {}) => {
  const result = await runPrisma(args, { env, input });

  if (result.code !== 0) {
    if (result.stderr) {
      console.error(result.stderr);
    }
    throw new Error(
      `${errorMessage || 'Falló la ejecución de Prisma.'}${
        result.stderr ? `\n${result.stderr.trim()}` : ''
      }`
    );
  }

  return result;
};

const parseTableRows = (stdout) =>
  stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.endsWith('|'))
    .map((line) => line.slice(1, -1).split('|').map((value) => value.trim()));

const parseSchemaConfig = (schemaText) => {
  const datasourceMatch = schemaText.match(/datasource\s+db\s*{([\s\S]*?)}/);
  if (!datasourceMatch) {
    return [];
  }
  const block = datasourceMatch[1];
  const schemasMatch = block.match(/schemas\s*=\s*\[([\s\S]*?)\]/);
  if (schemasMatch) {
    return Array.from(schemasMatch[1].matchAll(/"([^"]+)"/g)).map(
      (match) => match[1]
    );
  }
  const schemaMatch = block.match(/schema\s*=\s*"([^"]+)"/);
  return schemaMatch ? [schemaMatch[1]] : [];
};

const getTargetSchema = async () => {
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  try {
    const contents = await readFile(schemaPath, 'utf8');
    const schemas = parseSchemaConfig(contents);
    if (schemas.length > 1) {
      logStep(
        `Se detectaron múltiples schemas en Prisma (${schemas.join(
          ', '
        )}). Se usará: ${schemas[0]}`
      );
    }
    return schemas[0] || 'public';
  } catch (error) {
    console.warn(
      '\n[vercel-prisma] WARNING: No se pudo leer prisma/schema.prisma. Se asumirá schema public.'
    );
    return 'public';
  }
};

const escapeSqlLiteral = (value) => value.replace(/'/g, "''");

const runDbExecute = async (url, sql) => {
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

  return result.stdout;
};

const getSchemaObjectCounts = async (url, schema) => {
  logStep(`Consultando objetos en el schema "${schema}"...`);
  const schemaLiteral = escapeSqlLiteral(schema);
  const sql = `
SELECT
  (SELECT COUNT(*) FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname = '${schemaLiteral}' AND c.relkind IN ('r','p','v','m','S','f')) AS class_count,
  (SELECT COUNT(*) FROM pg_type t
    JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname = '${schemaLiteral}' AND t.typtype IN ('e','c')) AS type_count;
`;
  const stdout = await runDbExecute(url, sql);
  const rows = parseTableRows(stdout);
  const dataRow = rows.find((row) =>
    row.every((value) => /^\d+$/.test(value))
  );

  if (!dataRow) {
    throw new Error(
      'No se pudieron interpretar los conteos del schema. Revisa los logs anteriores.'
    );
  }

  const classCount = Number(dataRow[0]);
  const typeCount = Number(dataRow[1]);
  logStep(
    `Conteo de objetos en schema "${schema}": class_count=${classCount}, type_count=${typeCount}`
  );
  return { classCount, typeCount };
};

const hasPrismaMigrationsTable = async (url, schema) => {
  const schemaLiteral = escapeSqlLiteral(schema);
  const sql = `
SELECT EXISTS (
  SELECT 1
  FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname = '${schemaLiteral}'
    AND c.relname = '_prisma_migrations'
    AND c.relkind IN ('r','p')
) AS has_table;
`;
  const stdout = await runDbExecute(url, sql);
  const rows = parseTableRows(stdout);
  const dataRow = rows.find((row) =>
    row.every((value) => /^(true|false|t|f|0|1)$/i.test(value))
  );
  if (!dataRow) {
    throw new Error(
      'No se pudo determinar si existe _prisma_migrations. Revisa los logs anteriores.'
    );
  }
  return ['true', 't', '1'].includes(dataRow[0].toLowerCase());
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
    await runPrismaOrThrow(
      ['migrate', 'resolve', '--applied', migration, '--schema', 'prisma/schema.prisma'],
      {
        env,
        errorMessage: `Falló prisma migrate resolve para ${migration}.`,
      }
    );
  }
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

const isP3005Error = (result) =>
  /P3005/i.test(result.stderr || '') || /P3005/i.test(result.stdout || '');

const run = async () => {
  const migrateUrl =
    process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

  if (!migrateUrl) {
    throw new Error(
      'Se requiere DATABASE_URL o DATABASE_URL_UNPOOLED para ejecutar migraciones en Vercel.'
    );
  }

  const env = prismaEnv(migrateUrl);
  const schemaName = await getTargetSchema();
  logStep(`MIGRATE_URL seleccionado: ${sanitizeUrl(migrateUrl)}`);
  logStep(`Schema objetivo: ${schemaName}`);

  const { classCount, typeCount } = await getSchemaObjectCounts(
    migrateUrl,
    schemaName
  );
  const isEmpty = classCount === 0 && typeCount === 0;

  if (isEmpty) {
    logStep('Base de datos vacía. Ejecutando prisma migrate deploy...');
    const deployResult = await runPrisma(['migrate', 'deploy', '--schema', 'prisma/schema.prisma'], {
      env,
    });

    if (deployResult.code !== 0) {
      if (isP3005Error(deployResult)) {
        logStep(
          'Prisma detecta schema no vacío (P3005). Baselineando...'
        );
        await baselineMigrations(env);
        await runPrismaOrThrow(['migrate', 'deploy', '--schema', 'prisma/schema.prisma'], {
          env,
          errorMessage: 'Falló prisma migrate deploy luego de baseline.',
        });
      } else {
        if (deployResult.stderr) {
          console.error(deployResult.stderr);
        }
        throw new Error('Falló prisma migrate deploy en base vacía.');
      }
    }

    logStep('Generando Prisma Client...');
    await runPrismaOrThrow(['generate'], {
      env,
      errorMessage: 'Falló prisma generate.',
    });
    return;
  }

  const hasPrismaMigrations = await hasPrismaMigrationsTable(
    migrateUrl,
    schemaName
  );

  if (!hasPrismaMigrations) {
    logStep(
      'No se encontró _prisma_migrations. Baselineando antes de migrar...'
    );
    await baselineMigrations(env);
  }

  logStep('Ejecutando prisma migrate deploy...');
  await runPrismaOrThrow(['migrate', 'deploy', '--schema', 'prisma/schema.prisma'], {
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
