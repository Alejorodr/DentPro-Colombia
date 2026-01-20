import { NextResponse } from "next/server";
import { exec } from "node:child_process";
import { promisify } from "node:util";

import { getRequestId } from "@/app/api/_utils/request";
import { logger } from "@/lib/logger";
import {
  enforceOpsRateLimit,
  getOpsKey,
  isOpsIpAllowed,
  isOpsEnabled,
  respondGenericError,
  respondNotFound,
  respondUnauthorized,
} from "../_utils";
import * as Sentry from "@sentry/nextjs";

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
  const requestId = getRequestId(request);
  const startedAt = Date.now();
  if (!isOpsEnabled()) {
    return respondNotFound();
  }

  if (!isOpsIpAllowed(request)) {
    logger.warn({
      event: "ops.migrate.ip_blocked",
      route: "/api/ops/migrate",
      requestId,
      status: 403,
    });
    return respondUnauthorized();
  }

  const rateLimitResponse = await enforceOpsRateLimit(request);
  if (rateLimitResponse) {
    logger.warn({
      event: "ops.migrate.rate_limited",
      route: "/api/ops/migrate",
      requestId,
      status: 429,
    });
    return rateLimitResponse;
  }

  const opsKey = getOpsKey();
  const headerKey = request.headers.get("x-ops-key")?.trim();
  if (!opsKey || !headerKey || headerKey !== opsKey) {
    logger.warn({
      event: "ops.migrate.unauthorized",
      route: "/api/ops/migrate",
      requestId,
      status: 403,
    });
    return respondUnauthorized();
  }

  logger.info({
    event: "ops.migrate.start",
    route: "/api/ops/migrate",
    requestId,
  });

  try {
    await runCommand("npx prisma migrate deploy");
    await runCommand("npx prisma generate");
  } catch (error) {
    Sentry.captureException(error);
    logger.error({
      event: "ops.migrate.failed",
      route: "/api/ops/migrate",
      requestId,
      status: 500,
      durationMs: Date.now() - startedAt,
      error,
    });
    return respondGenericError();
  }

  logger.info({
    event: "ops.migrate.success",
    route: "/api/ops/migrate",
    requestId,
    status: 200,
    durationMs: Date.now() - startedAt,
  });
  return NextResponse.json({ message: GENERIC_SUCCESS_MESSAGE }, { status: 200 });
}
