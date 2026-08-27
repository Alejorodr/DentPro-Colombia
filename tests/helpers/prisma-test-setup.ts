import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type PrismaTestPaths = {
  dbDir: string;
  prismaClientPath: string;
  schemaPath: string;
  templateDbPath: string;
};

export function getPrismaTestPaths(root = process.cwd()): PrismaTestPaths {
  const dbDir = path.join(root, "tests", ".tmp");

  return {
    dbDir,
    prismaClientPath: path.join(root, "tests", "prisma-client", "index.js"),
    schemaPath: path.join(root, "prisma", "schema.test.prisma"),
    templateDbPath: path.join(dbDir, "analytics-template.db"),
  };
}

export function getPrismaWorkerDatabasePath(root = process.cwd()) {
  const { dbDir } = getPrismaTestPaths(root);
  const workerId = process.env.VITEST_POOL_ID ?? process.env.VITEST_WORKER_ID ?? String(process.pid);

  return path.join(dbDir, `analytics-test-${workerId}.db`);
}

export function preparePrismaTestDatabase(root = process.cwd()) {
  const { dbDir, schemaPath, templateDbPath } = getPrismaTestPaths(root);
  const databaseUrl = `file:${templateDbPath}`;
  const env = {
    ...process.env,
    TEST_DATABASE_URL: databaseUrl,
    DATABASE_URL: databaseUrl,
  };
  const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");

  fs.mkdirSync(dbDir, { recursive: true });
  if (fs.existsSync(templateDbPath)) {
    fs.rmSync(templateDbPath);
  }

  execFileSync(process.execPath, [prismaCli, "generate", "--schema", schemaPath], { stdio: "ignore", env });
  execFileSync(process.execPath, [prismaCli, "db", "push", "--schema", schemaPath], { stdio: "ignore", env });
}
