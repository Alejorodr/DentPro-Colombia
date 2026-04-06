import { AccessLogAction, Prisma } from "@prisma/client";

import { logger } from "@/lib/logger";
import { getPrismaClient } from "@/lib/prisma";

export type ClinicalAccessLogInput = {
  userId: string;
  patientId?: string | null;
  action: AccessLogAction;
  route: string;
  requestId: string;
  metadata?: Prisma.InputJsonValue | null;
};

export async function logClinicalAccess({
  userId,
  patientId,
  action,
  route,
  requestId,
  metadata,
}: ClinicalAccessLogInput) {
  const prisma = getPrismaClient();

  try {
    await prisma.accessLog.create({
      data: {
        userId,
        patientId: patientId ?? null,
        action,
        route,
        requestId,
        metadata: metadata ?? undefined,
      },
    });
  } catch (error) {
    logger.error(
      {
        event: "clinical.access_log.write_failed",
        route,
        requestId,
        userId,
        action,
        patientId: patientId ?? undefined,
        error,
      },
      "Failed to write clinical access log",
    );
  }
}
