import "server-only";

import { cache } from "react";

import { getPrismaClient } from "@/lib/prisma";
import { getAdminKpis as getAdminKpisBase, getAdminTrend as getAdminTrendBase } from "@/lib/analytics/admin";
import type { AnalyticsBucket, AnalyticsRange, AnalyticsRangeKey } from "@/lib/analytics/range";
import { parseRange } from "@/lib/analytics/range";

export type { AnalyticsBucket, AnalyticsRange, AnalyticsRangeKey } from "@/lib/analytics/range";
export { parseRange };

export const getAdminKpis = cache(async ({ from, to }: { from: Date; to: Date }) => {
  const prisma = getPrismaClient();
  return getAdminKpisBase(prisma, { from, to });
});

export const getAdminTrend = cache(
  async ({
    from,
    to,
    bucket,
    timeZone,
  }: {
    from: Date;
    to: Date;
    bucket: AnalyticsBucket;
    timeZone?: string;
  }) => {
    const prisma = getPrismaClient();
    return getAdminTrendBase(prisma, { from, to, bucket, timeZone });
  },
);

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
      professional: { include: { user: true, specialty: true } },
    },
    orderBy: { timeSlot: { startAt: "asc" } },
    take: limit,
  });
});
