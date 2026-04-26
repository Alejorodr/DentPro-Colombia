import { NextResponse } from "next/server";

import { errorResponse } from "@/app/api/_utils/response";
import { requireRole, requireSession } from "@/lib/authz";
import { getPrismaClient } from "@/lib/prisma";

type AuditListItem = {
  id: string;
  createdAt: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  targetLabel: string | null;
  status: "success" | "failure";
  actor: {
    userId: string | null;
    role: string | null;
    identifier: string | null;
  };
  metadataPreview: string[];
};

const DEFAULT_LIMIT = 30;
type AuditLogRow = {
  id: string;
  createdAt: Date;
  action: string;
  resourceType: string;
  resourceId: string | null;
  targetLabel: string | null;
  status: string;
  actorUserId: string | null;
  actorRole: string | null;
  actorIdentifier: string | null;
  metadata: unknown;
};


const MAX_LIMIT = 50;
const ALLOWED_STATUS = new Set(["success", "failure"] as const);

function parseLimit(searchParams: URLSearchParams) {
  const rawLimit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);
  if (Number.isNaN(rawLimit)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.max(1, Math.trunc(rawLimit)), MAX_LIMIT);
}

function parseStatus(searchParams: URLSearchParams): "success" | "failure" | undefined {
  const rawStatus = searchParams.get("status");
  if (!rawStatus) {
    return undefined;
  }
  if (ALLOWED_STATUS.has(rawStatus as "success" | "failure")) {
    return rawStatus as "success" | "failure";
  }
  return undefined;
}

function buildMetadataPreview(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }

  return Object.entries(metadata as Record<string, unknown>)
    .slice(0, 3)
    .map(([key, value]) => {
      if (typeof value === "string") {
        return `${key}: ${value.slice(0, 60)}`;
      }
      if (typeof value === "number" || typeof value === "boolean") {
        return `${key}: ${String(value)}`;
      }
      if (Array.isArray(value)) {
        return `${key}: ${value.length} elementos`;
      }
      if (!value) {
        return `${key}: null`;
      }
      return `${key}: [objeto]`;
    });
}

function encodeCursor(createdAt: Date, id: string) {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString("base64url");
}

function decodeCursor(cursor: string | null): { createdAt: Date; id: string } | null {
  if (!cursor) {
    return null;
  }

  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const [rawDate, id] = decoded.split("|");
    const createdAt = new Date(rawDate);

    if (!id || Number.isNaN(createdAt.getTime())) {
      return null;
    }

    return { createdAt, id };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams);
  const status = parseStatus(searchParams);
  const cursor = decodeCursor(searchParams.get("cursor"));

  const prisma = getPrismaClient();
  const items = (await prisma.auditLog.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(cursor
        ? {
            OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: {
      id: true,
      createdAt: true,
      action: true,
      resourceType: true,
      resourceId: true,
      targetLabel: true,
      status: true,
      actorUserId: true,
      actorRole: true,
      actorIdentifier: true,
      metadata: true,
    },
  })) as AuditLogRow[];

  const hasNext = items.length > limit;
  const visibleItems = hasNext ? items.slice(0, limit) : items;
  const nextCursor = hasNext
    ? encodeCursor(visibleItems[visibleItems.length - 1].createdAt, visibleItems[visibleItems.length - 1].id)
    : null;

  const responseItems: AuditListItem[] = visibleItems.map((item) => ({
    id: item.id,
    createdAt: item.createdAt.toISOString(),
    action: item.action,
    resourceType: item.resourceType,
    resourceId: item.resourceId,
    targetLabel: item.targetLabel,
    status: item.status === "failure" ? "failure" : "success",
    actor: {
      userId: item.actorUserId,
      role: item.actorRole,
      identifier: item.actorIdentifier,
    },
    metadataPreview: buildMetadataPreview(item.metadata),
  }));

  return NextResponse.json({
    items: responseItems,
    nextCursor,
    limit,
  });
}
