import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { PrismaClient } from "@prisma/client";

type TestPrisma = {
  prisma: PrismaClient;
  reset: () => Promise<void>;
  disconnect: () => Promise<void>;
};

let prismaPromise: Promise<TestPrisma> | null = null;

function ensureClientGenerated(schemaPath: string, databaseUrl: string) {
  execSync(`npx prisma generate --schema ${schemaPath}`, { stdio: "ignore" });
  execSync(`npx prisma db push --schema ${schemaPath} --skip-generate`, {
    stdio: "ignore",
    env: {
      ...process.env,
      TEST_DATABASE_URL: databaseUrl,
    },
  });
}

export async function getTestPrisma(): Promise<TestPrisma> {
  if (prismaPromise) {
    return prismaPromise;
  }

  prismaPromise = (async () => {
    const root = process.cwd();
    const schemaPath = path.join(root, "prisma", "schema.test.prisma");
    const dbDir = path.join(root, "tests", ".tmp");
    const dbPath = path.join(dbDir, "analytics-test.db");
    const databaseUrl = `file:${dbPath}`;

    fs.mkdirSync(dbDir, { recursive: true });
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath);
    }

    process.env.TEST_DATABASE_URL = databaseUrl;
    process.env.DATABASE_URL = databaseUrl;
    ensureClientGenerated(schemaPath, databaseUrl);

    const prismaClientPath = path.join(root, "tests", "prisma-client", "index.js");
    const prismaModule = await import(pathToFileURL(prismaClientPath).toString());
    const PrismaClientConstructor = prismaModule.PrismaClient as typeof PrismaClient;
    const prisma = new PrismaClientConstructor();

    const reset = async () => {
      await prisma.appointment.deleteMany();
      await prisma.timeSlot.deleteMany();
      await prisma.passwordResetToken.deleteMany();
      await prisma.patientProfile.deleteMany();
      await prisma.professionalProfile.deleteMany();
      await prisma.service.deleteMany();
      await prisma.specialty.deleteMany();
      await prisma.user.deleteMany();
    };

    return {
      prisma,
      reset,
      disconnect: () => prisma.$disconnect(),
    };
  })();

  return prismaPromise;
}
