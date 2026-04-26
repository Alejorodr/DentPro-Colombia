import { NextResponse } from "next/server";

import { logApiError } from "@/app/api/_utils/observability";
import { errorResponse } from "@/app/api/_utils/response";
import { getPaginationParams, buildPaginatedResponse } from "@/app/api/_utils/pagination";
import { getPrismaClient } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/authz";

function parseDateParam(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
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

  const prisma = getPrismaClient();
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("patientId") ?? undefined;
  const userId = searchParams.get("userId") ?? undefined;
  const from = parseDateParam(searchParams.get("from"));
  const to = parseDateParam(searchParams.get("to"));

  if (from === null || to === null) {
    return errorResponse("Filtro de fechas inválido.", 400);
  }

  const { page, pageSize, skip, take } = getPaginationParams(searchParams);

  const where = {
    ...(patientId ? { patientId } : {}),
    ...(userId ? { userId } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };

  try {
    const [logs, total] = await Promise.all([
      prisma.accessLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          user: { select: { name: true, lastName: true, role: true } },
          patient: { include: { user: { select: { name: true, lastName: true } } } },
        },
      }),
      prisma.accessLog.count({ where }),
    ]);

    const data = logs.map((log) => ({
      id: log.id,
      action: log.action,
      route: log.route,
      requestId: log.requestId,
      createdAt: log.createdAt,
      user: {
        id: log.userId,
        name: `${log.user.name} ${log.user.lastName}`.trim(),
        role: log.user.role,
      },
      patient: log.patient
        ? {
            id: log.patientId,
            name: `${log.patient.user.name} ${log.patient.user.lastName}`.trim(),
          }
        : null,
      metadata: log.metadata,
    }));

    return NextResponse.json(buildPaginatedResponse(data, page, pageSize, total));
  } catch (error) {
    logApiError(
      {
        event: "admin.access_logs.list_failed",
        route: "/api/admin/audit/access-logs",
        userId: sessionResult.user.id,
      },
      error,
    );
    return errorResponse("No se pudieron cargar los logs de acceso.", 500);
  }
}
