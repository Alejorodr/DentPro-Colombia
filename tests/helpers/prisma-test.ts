import fs from "node:fs";
import { pathToFileURL } from "node:url";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import type { PrismaClient } from "@prisma/client";

import { getPrismaTestPaths, getPrismaWorkerDatabasePath, preparePrismaTestDatabase } from "./prisma-test-setup";

type TestPrisma = {
  prisma: PrismaClient;
  reset: () => Promise<void>;
  disconnect: () => Promise<void>;
};

let prismaPromise: Promise<TestPrisma> | null = null;

export async function getTestPrisma(): Promise<TestPrisma> {
  if (prismaPromise) {
    return prismaPromise;
  }

  prismaPromise = (async () => {
    const root = process.cwd();
    const { dbDir, prismaClientPath, templateDbPath } = getPrismaTestPaths(root);
    const dbPath = getPrismaWorkerDatabasePath(root);
    const databaseUrl = `file:${dbPath}`;

    if (!fs.existsSync(templateDbPath) || !fs.existsSync(prismaClientPath)) {
      preparePrismaTestDatabase(root);
    }

    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath);
    }
    fs.mkdirSync(dbDir, { recursive: true });
    fs.copyFileSync(templateDbPath, dbPath);

    process.env.TEST_DATABASE_URL = databaseUrl;
    process.env.DATABASE_URL = databaseUrl;

    const prismaModule = await import(pathToFileURL(prismaClientPath).toString());
    const PrismaClientConstructor = prismaModule.PrismaClient as typeof PrismaClient;
    const adapter = new PrismaBetterSqlite3({ url: dbPath });
    const prisma = new PrismaClientConstructor({ adapter });

    const reset = async () => {
      await prisma.appointment.deleteMany();
      await prisma.timeSlot.deleteMany();
      await prisma.notificationPreference.deleteMany();
      await prisma.availabilityBlock.deleteMany();
      await prisma.clinicHoliday.deleteMany();
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
