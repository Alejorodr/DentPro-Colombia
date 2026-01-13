import { AppointmentStatus, TimeSlotStatus, type PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { buildBucketStarts, normalizeBucketStart, type AnalyticsBucket } from "@/lib/analytics/range";
import { formatInTimeZone, fromZonedDateParts, getAnalyticsTimeZone } from "@/lib/dates/tz";

export type AdminKpis = {
  totalAppointments: number;
  statusCounts: Record<AppointmentStatus, number>;
  newPatients: number;
  activeProfessionals: number;
  totalSlots: number;
  bookedSlots: number;
  utilizationRate: number;
  cancellations: number;
};

export type AdminTrend = {
  series: number[];
  labels: string[];
  metricLabel: string;
  bucket: AnalyticsBucket;
};

export type AdminRecentAppointment = {
  id: string;
  startAt: Date;
  status: AppointmentStatus;
  patientName: string | null;
  professionalName: string | null;
  specialty: string | null;
};

function formatBucketLabel(date: Date, bucket: AnalyticsBucket, timeZone: string) {
  if (bucket === "month") {
    return formatInTimeZone(date, timeZone, { month: "short" });
  }

  const base = formatInTimeZone(date, timeZone, { month: "short", day: "2-digit" });
  if (bucket === "week") {
    return `Semana ${base}`;
  }
  return base;
}

function toUtcFromZonedDate(date: Date, timeZone: string) {
  return fromZonedDateParts(
    {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds(),
    },
    timeZone,
  );
}

export async function getAdminKpis(
  prisma: PrismaClient,
  { from, to }: { from: Date; to: Date },
): Promise<AdminKpis> {
  const [totalAppointments, statusRows, newPatients, totalSlots, bookedSlots, activeWithAppointments, activeTotal] =
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
      prisma.professionalProfile.count({ where: { active: true } }),
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
  // Si no hay citas en el rango, reportamos el total de profesionales activos.
  const activeProfessionals = totalAppointments > 0 ? activeWithAppointments.length : activeTotal;
  const cancellations = statusCounts[AppointmentStatus.CANCELLED] ?? 0;

  return {
    totalAppointments,
    statusCounts,
    newPatients,
    activeProfessionals,
    totalSlots,
    bookedSlots,
    utilizationRate,
    cancellations,
  };
}

export async function getAdminTrend(
  prisma: PrismaClient,
  {
    from,
    to,
    bucket,
    timeZone,
    useSql = true,
  }: { from: Date; to: Date; bucket: AnalyticsBucket; timeZone?: string; useSql?: boolean },
): Promise<AdminTrend> {
  const resolvedZone = timeZone ?? getAnalyticsTimeZone();
  const bucketValue = bucket;

  const counts = new Map<string, number>();
  if (useSql) {
    const rows = await prisma.$queryRaw<Array<{ bucket: Date; count: bigint }>>(
      Prisma.sql`
        SELECT
          date_trunc(${bucketValue}, t."startAt" AT TIME ZONE ${resolvedZone}) AS bucket,
          COUNT(a."id")::bigint AS count
        FROM "Appointment" a
        INNER JOIN "TimeSlot" t ON t."id" = a."timeSlotId"
        WHERE t."startAt" >= ${from} AND t."startAt" < ${to}
        GROUP BY 1
        ORDER BY 1
      `,
    );

    for (const row of rows) {
      const normalized = normalizeBucketStart(toUtcFromZonedDate(row.bucket, resolvedZone), bucket, resolvedZone);
      counts.set(normalized.toISOString(), Number(row.count));
    }
  } else {
    const appointments = await prisma.appointment.findMany({
      where: {
        timeSlot: {
          startAt: {
            gte: from,
            lt: to,
          },
        },
      },
      select: { timeSlot: { select: { startAt: true } } },
    });

    for (const appointment of appointments) {
      const normalized = normalizeBucketStart(appointment.timeSlot.startAt, bucket, resolvedZone);
      const key = normalized.toISOString();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const bucketStarts = buildBucketStarts(from, to, bucket, resolvedZone);
  const series = bucketStarts.map((start) => counts.get(start.toISOString()) ?? 0);
  const labels = bucketStarts.map((start) => formatBucketLabel(start, bucket, resolvedZone));
  const metricLabel =
    bucket === "month" ? "Citas por mes" : bucket === "week" ? "Citas por semana" : "Citas por día";

  return {
    series,
    labels,
    metricLabel,
    bucket,
  };
}

export async function getAdminRecentAppointments(
  prisma: PrismaClient,
  {
    from,
    to,
    limit,
  }: {
    from: Date;
    to: Date;
    limit?: number;
  },
): Promise<AdminRecentAppointment[]> {
  const appointments = await prisma.appointment.findMany({
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
      professional: { include: { user: true, specialty: true } },
    },
    orderBy: { timeSlot: { startAt: "asc" } },
    take: limit,
  });

  return appointments.map((appointment) => ({
    id: appointment.id,
    startAt: appointment.timeSlot.startAt,
    status: appointment.status,
    patientName: appointment.patient?.user
      ? `${appointment.patient.user.name} ${appointment.patient.user.lastName}`.trim()
      : null,
    professionalName: appointment.professional?.user
      ? `${appointment.professional.user.name} ${appointment.professional.user.lastName}`.trim()
      : null,
    specialty: appointment.professional?.specialty?.name ?? null,
  }));
}
