import type { Prisma } from "@prisma/client";

import { logger } from "@/lib/logger";
import { getPrismaClient } from "@/lib/prisma";

type AuditStatus = "success" | "failure";

type AuditMetadataValue = string | number | boolean | null;

type AuditActor = {
  userId?: string | null;
  role?: string | null;
  identifier?: string | null;
};

type AuditEventInput = {
  actor?: AuditActor;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  targetLabel?: string | null;
  status: AuditStatus;
  metadata?: Record<string, AuditMetadataValue | AuditMetadataValue[] | undefined>;
};

const MAX_METADATA_STRING_LENGTH = 280;
const MAX_METADATA_KEYS = 12;

function normalizeMetadataValue(value: AuditMetadataValue | AuditMetadataValue[] | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 20)
      .map((item) => (typeof item === "string" ? item.slice(0, MAX_METADATA_STRING_LENGTH) : item));
  }

  if (typeof value === "string") {
    return value.slice(0, MAX_METADATA_STRING_LENGTH);
  }

  return value;
}

function sanitizeMetadata(
  metadata?: Record<string, AuditMetadataValue | AuditMetadataValue[] | undefined>,
): Prisma.InputJsonObject | undefined {
  if (!metadata) {
    return undefined;
  }

  const entries = Object.entries(metadata)
    .slice(0, MAX_METADATA_KEYS)
    .map(([key, value]) => [key, normalizeMetadataValue(value)] as const)
    .filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries) as Prisma.InputJsonObject;
}

export async function logAuditEvent(event: AuditEventInput) {
  try {
    const prisma = getPrismaClient();
    await prisma.auditLog.create({
      data: {
        actorUserId: event.actor?.userId ?? null,
        actorRole: event.actor?.role ?? null,
        actorIdentifier: event.actor?.identifier ?? null,
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId ?? null,
        targetLabel: event.targetLabel ?? null,
        status: event.status,
        metadata: sanitizeMetadata(event.metadata),
      },
    });
  } catch (error) {
    logger.warn({
      event: "audit.log_write_failed",
      action: event.action,
      resourceType: event.resourceType,
      status: event.status,
      error,
    });
  }
}
