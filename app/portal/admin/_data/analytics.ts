import "server-only";

import { cache } from "react";
import { AppointmentStatus, TimeSlotStatus } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";
import { buildBucketStarts, normalizeBucketStart, type AnalyticsBucket } from "@/app/portal/admin/_data/analytics-range";

export type { AnalyticsBucket, AnalyticsRange, AnalyticsRangeKey } from "@/app/portal/admin/_data/analytics-range";
export { parseRange } from "@/app/portal/admin/_data/analytics-range";

function formatBucketLabel(date: Date, bucket: AnalyticsBucket) {
  if (bucket === "week") {
    return `Semana ${date.toLocaleDateString("es-CO", {
      month: "short",
      day: "2-digit",
    })}`;
  }

  return date.toLocaleDateString("es-CO", {
    month: "short",
    day: "2-digit",
  });
}


export const getAdminKpis = cache(async ({ from, to }: { from: Date; to: Date }) => {
  const prisma = getPrismaClient();

  const [totalAppointments, statusRows, newPatients, totalSlots, bookedSlots, activeProfessionals] =
    await Promise.all([
      prisma.appointment.count({
        where: {
          timeSlot: {
            startAt: {
              gte: from,
              lt: to,
            },
          },
        },
      }),
      prisma.appointment.groupBy({
        by: ["status"],
        where: {
          timeSlot: {
            startAt: {
              gte: from,
              lt: to,
            },
          },
        },
        _count: { status: true },
      }),
      prisma.user.count({
        where: {
          role: "PACIENTE",
          createdAt: {
            gte: from,
            lt: to,
          },
        },
      }),
      prisma.timeSlot.count({
        where: {
          startAt: {
            gte: from,
            lt: to,
          },
        },
      }),
      prisma.timeSlot.count({
        where: {
          startAt: {
            gte: from,
            lt: to,
          },
          status: TimeSlotStatus.BOOKED,
        },
      }),
      prisma.appointment.findMany({
        where: {
          timeSlot: {
            startAt: {
              gte: from,
              lt: to,
            },
          },
          professional: {
            active: true,
          },
        },
        distinct: ["professionalId"],
        select: { professionalId: true },
      }),
    ]);

  const statusCounts = Object.values(AppointmentStatus).reduce(
    (acc, status) => ({
      ...acc,
      [status]: 0,
    }),
    {} as Record<AppointmentStatus, number>,
  );

  for (const row of statusRows) {
    statusCounts[row.status] = row._count.status;
  }

  const utilizationRate = totalSlots > 0 ? bookedSlots / totalSlots : 0;

  return {
    totalAppointments,
    statusCounts,
    newPatients,
    activeProfessionals: activeProfessionals.length,
    totalSlots,
    bookedSlots,
    utilizationRate,
  };
});

export const getAdminTrend = cache(async ({
  from,
  to,
  bucket,
}: {
  from: Date;
  to: Date;
  bucket: AnalyticsBucket;
}) => {
  const prisma = getPrismaClient();

  const rows = await prisma.$queryRaw<Array<{ bucket: Date; count: bigint }>>`
    SELECT
      date_trunc(${bucket}, t."startAt") AS bucket,
      COUNT(a."id")::bigint AS count
    FROM "Appointment" a
    INNER JOIN "TimeSlot" t ON t."id" = a."timeSlotId"
    WHERE t."startAt" >= ${from} AND t."startAt" < ${to}
    GROUP BY 1
    ORDER BY 1
  `;

  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = normalizeBucketStart(row.bucket, bucket).toISOString();
    counts.set(key, Number(row.count));
  }

  const bucketStarts = buildBucketStarts(from, to, bucket);
  const series = bucketStarts.map((start) => counts.get(start.toISOString()) ?? 0);
  const labels = bucketStarts.map((start) => formatBucketLabel(start, bucket));

  return {
    series,
    labels,
    metricLabel: bucket === "week" ? "Citas por semana" : "Citas por día",
  };
});

export const getAppointmentsForRange = cache(async ({
  from,
  to,
  limit,
}: {
  from: Date;
  to: Date;
  limit?: number;
}) => {
  const prisma = getPrismaClient();

  return prisma.appointment.findMany({
    where: {
      timeSlot: {
        startAt: {
          gte: from,
          lt: to,
        },
      },
    },
    include: {
      timeSlot: true,
      patient: { include: { user: true } },
      professional: { include: { user: true } },
    },
    orderBy: { timeSlot: { startAt: "asc" } },
    take: limit,
  });
});
