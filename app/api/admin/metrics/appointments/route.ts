import { NextResponse } from "next/server";

import { requireRole, requireSession } from "@/lib/authz";
import { getPrismaClient } from "@/lib/prisma";
import { AppointmentStatus, TimeSlotStatus } from "@prisma/client";
import { errorResponse } from "@/app/api/_utils/response";

export const revalidate = 300;

function parseRange(searchParams: URLSearchParams) {
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const fallbackEnd = new Date();
  const fallbackStart = new Date();
  fallbackStart.setDate(fallbackEnd.getDate() - 30);

  if (!from || !to) {
    return { start: fallbackStart, end: fallbackEnd };
  }

  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T23:59:59`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return { start: fallbackStart, end: fallbackEnd };
  }

  return { start, end };
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
  const { start, end } = parseRange(searchParams);

  const prisma = getPrismaClient();
  const appointments = await prisma.appointment.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { createdAt: true, status: true },
  });

  const dailyMap = new Map<string, { date: string; total: number; cancelled: number }>();
  appointments.forEach((appointment) => {
    const dateKey = appointment.createdAt.toISOString().slice(0, 10);
    const entry = dailyMap.get(dateKey) ?? { date: dateKey, total: 0, cancelled: 0 };
    entry.total += 1;
    if (appointment.status === AppointmentStatus.CANCELLED) {
      entry.cancelled += 1;
    }
    dailyMap.set(dateKey, entry);
  });

  const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  const totalAppointments = appointments.length;
  const cancelledCount = appointments.filter((appointment) => appointment.status === AppointmentStatus.CANCELLED).length;
  const absenceRate = totalAppointments > 0 ? (cancelledCount / totalAppointments) * 100 : 0;

  const totalSlots = await prisma.timeSlot.count({
    where: {
      startAt: { gte: start, lte: end },
      status: { not: TimeSlotStatus.BREAK },
    },
  });
  const bookedSlots = await prisma.timeSlot.count({
    where: {
      startAt: { gte: start, lte: end },
      status: TimeSlotStatus.BOOKED,
    },
  });
  const occupancyRate = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;

  return NextResponse.json({
    range: { from: start.toISOString(), to: end.toISOString() },
    daily,
    totals: {
      totalAppointments,
      cancelledCount,
      noShowCount: 0,
      absenceRate,
    },
    occupancy: {
      totalSlots,
      bookedSlots,
      rate: occupancyRate,
    },
  });
}
