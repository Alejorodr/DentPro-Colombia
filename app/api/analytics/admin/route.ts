import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getAdminKpis, getAdminRecentAppointments, getAdminTrend } from "@/lib/analytics/admin";
import { parseRange } from "@/lib/analytics/range";
import { getPrismaClient } from "@/lib/prisma";

export const runtime = "nodejs";

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
  const [kpis, trend, recentAppointments] = await Promise.all([
    getAdminKpis(prisma, { from: range.from, to: range.to }),
    getAdminTrend(prisma, { from: range.from, to: range.to, bucket: range.bucket, timeZone: range.timeZone }),
    getAdminRecentAppointments(prisma, { from: range.from, to: range.to, limit: 12 }),
  ]);

  return NextResponse.json({
    range: range.rangeKey,
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    bucket: range.bucket,
    kpis,
    trend,
    recentAppointments: recentAppointments.map((appointment) => ({
      id: appointment.id,
      startAt: appointment.startAt.toISOString(),
      status: appointment.status,
      patientName: appointment.patientName,
      professionalName: appointment.professionalName,
      specialty: appointment.specialty,
    })),
  });
}
