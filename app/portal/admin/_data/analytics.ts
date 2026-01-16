import "server-only";

import { cache } from "react";

import { getPrismaClient } from "@/lib/prisma";
import {
  getAdminAppointmentsSummary as getAdminAppointmentsSummaryBase,
  getAdminKpis as getAdminKpisBase,
  getAdminRevenueTrend as getAdminRevenueTrendBase,
  getAdminStaffOnDuty as getAdminStaffOnDutyBase,
  getAdminTrend as getAdminTrendBase,
} from "@/lib/analytics/admin";
import type { AnalyticsBucket } from "@/lib/analytics/range";
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

export const getAdminRevenueTrend = cache(
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
    return getAdminRevenueTrendBase(prisma, { from, to, bucket, timeZone });
  },
);

export const getStaffOnDuty = cache(async () => {
  const prisma = getPrismaClient();
  return getAdminStaffOnDutyBase(prisma);
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
  return getAdminAppointmentsSummaryBase(prisma, { from, to, limit });
});
