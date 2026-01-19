import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  getAdminAppointmentsSummary,
  getAdminKpis,
  getAdminRevenueTrend,
  getAdminStaffOnDuty,
  getAdminTrend,
} from "@/lib/analytics/admin";
import { parseRange } from "@/lib/analytics/range";
import { logger } from "@/lib/logger";
import { getPrismaClient, isDatabaseUnavailableError } from "@/lib/prisma";
import { AppointmentStatus } from "@prisma/client";
import { serviceUnavailableResponse } from "@/app/api/_utils/response";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = String(session.user.role ?? "");
  if (!["ADMINISTRADOR", "ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
}
