import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getPrismaClient } from "@/lib/prisma";
import {
  enforceRateLimit,
  getOpsKey,
  isOpsEnabled,
  respondGenericError,
  respondNotFound,
  respondUnauthorized,
} from "../_utils";

const GENERIC_SUCCESS_MESSAGE = "Operación completada.";

function requireSeedEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name} for OPS seed.`);
  }
  return value;
}

// TEMPORAL: endpoint de emergencia para crear/actualizar el admin.
export async function POST(request: Request) {
  if (!isOpsEnabled()) {
    return respondNotFound();
  }

  const rateLimitResponse = enforceRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const opsKey = getOpsKey();
  const headerKey = request.headers.get("x-ops-key")?.trim();
  if (!opsKey || !headerKey || headerKey !== opsKey) {
    return respondUnauthorized();
  }

  try {
    const adminEmail = requireSeedEnv("SEED_ADMIN_EMAIL").toLowerCase();
    const adminPassword = requireSeedEnv("SEED_ADMIN_PASSWORD");
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const prisma = getPrismaClient();

    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        role: Role.ADMINISTRADOR,
        passwordHash,
        name: "Admin",
        lastName: "DentPro",
      },
      create: {
        email: adminEmail,
        role: Role.ADMINISTRADOR,
        passwordHash,
        name: "Admin",
        lastName: "DentPro",
      },
    });
  } catch (error) {
    console.error("OPS seed admin failed", error);
    return respondGenericError();
  }

  return NextResponse.json({ message: GENERIC_SUCCESS_MESSAGE }, { status: 200 });
}
