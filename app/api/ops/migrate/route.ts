import { NextResponse } from "next/server";
import { exec } from "node:child_process";
import { promisify } from "node:util";

import {
  enforceRateLimit,
  getOpsKey,
  isOpsEnabled,
  respondGenericError,
  respondNotFound,
  respondUnauthorized,
} from "../_utils";

const execAsync = promisify(exec);
const GENERIC_SUCCESS_MESSAGE = "Operación completada.";

async function runCommand(command: string) {
  await execAsync(command, {
    cwd: process.cwd(),
    env: process.env,
  });
}

// TEMPORAL: endpoint de emergencia para ejecutar migraciones en producción.
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
    await runCommand("npx prisma migrate deploy");
    await runCommand("npx prisma generate");
  } catch (error) {
    console.error("OPS migrate failed", error);
    return respondGenericError();
  }

  return NextResponse.json({ message: GENERIC_SUCCESS_MESSAGE }, { status: 200 });
}
