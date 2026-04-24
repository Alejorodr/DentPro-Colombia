import { NextResponse } from "next/server";
import { AppointmentStatus } from "@prisma/client";

import { errorResponse, internalServerErrorResponse, serviceUnavailableResponse } from "@/app/api/_utils/response";
import {
  getAdminAppointmentsSummary,
  getAdminKpis,
  getAdminRevenueTrend,
  getAdminStaffOnDuty,
  getAdminTrend,
} from "@/lib/analytics/admin";
import { parseRange } from "@/lib/analytics/range";
import { requireRole, requireSession } from "@/lib/authz";
import { logger } from "@/lib/logger";
import { getPrismaClient, isDatabaseUnavailableError } from "@/lib/prisma";

export async function GET(request: Request) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }
  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  try {
    const { searchParams } = new URL(request.url);
    const range = parseRange({
      range: searchParams.get("range") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });

    const prisma = getPrismaClient();
    const results = await Promise.allSettled([
      getAdminKpis(prisma, { from: range.from, to: range.to }),
      getAdminTrend(prisma, { from: range.from, to: range.to, bucket: range.bucket, timeZone: range.timeZone }),
      getAdminRevenueTrend(prisma, { from: range.from, to: range.to, bucket: range.bucket, timeZone: range.timeZone }),
      getAdminAppointmentsSummary(prisma, { from: range.from, to: range.to, limit: 12 }),
      getAdminStaffOnDuty(prisma),
    ]);

    for (const result of results) {
      if (result.status === "rejected") {
        if (isDatabaseUnavailableError(result.reason)) {
          return serviceUnavailableResponse("Base de datos temporalmente no disponible.", result.reason.retryAfterMs);
        }
        logger.error(
          {
            event: "admin.analytics.partial_failure",
            route: "/api/analytics/admin",
            userId: sessionResult.user.id,
            error: result.reason,
          },
          "Fallo parcial en métricas de administración",
        );
      }
    }

    const emptyStatusCounts = Object.values(AppointmentStatus).reduce(
      (acc, status) => ({ ...acc, [status]: 0 }),
      {} as Record<AppointmentStatus, number>,
    );

    const kpis =
      results[0]?.status === "fulfilled"
        ? results[0].value
        : {
            totalAppointments: 0,
            statusCounts: emptyStatusCounts,
            newPatients: 0,
            activeProfessionals: 0,
            totalSlots: 0,
            bookedSlots: 0,
            utilizationRate: 0,
            cancellations: 0,
            revenueCents: 0,
            pendingApprovals: 0,
          };
    const trend =
      results[1]?.status === "fulfilled"
        ? results[1].value
        : {
            series: [],
            labels: [],
            metricLabel:
              range.bucket === "month"
                ? "Citas por mes"
                : range.bucket === "week"
                  ? "Citas por semana"
                  : "Citas por día",
            bucket: range.bucket,
          };
    const revenueTrend =
      results[2]?.status === "fulfilled"
        ? results[2].value
        : {
            series: [],
            labels: [],
            totalCents: 0,
            bucket: range.bucket,
          };
    const recentAppointments = results[3]?.status === "fulfilled" ? results[3].value : [];
    const staffOnDuty = results[4]?.status === "fulfilled" ? results[4].value : [];

    return NextResponse.json({
      range: range.rangeKey,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      bucket: range.bucket,
      kpis,
      trend,
      revenueTrend,
      staffOnDuty,
      todaysAppointments: recentAppointments.map((appointment) => ({
        id: appointment.id,
        startAt: appointment.startAt.toISOString(),
        status: appointment.status,
        patientName: appointment.patientName,
        professionalName: appointment.professionalName,
        serviceName: appointment.serviceName,
      })),
    });
  } catch (error) {
    logger.error(
      {
        event: "admin.analytics.unexpected_failure",
        route: "/api/analytics/admin",
        userId: sessionResult.user.id,
        error,
      },
      "Fallo inesperado en analytics admin",
    );
    return internalServerErrorResponse("No se pudieron cargar las métricas de administración.");
  }
}
