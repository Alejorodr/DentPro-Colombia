import { NextResponse } from "next/server";

import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";
import { addDaysZoned, formatDateInput, fromZonedDateParts, getAnalyticsTimeZone } from "@/lib/dates/tz";
import { AppointmentStatus } from "@prisma/client";

function parseMonthInput(value?: string | null) {
  if (!value) return null;
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return null;
  return { year, month };
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (!isAuthorized(sessionUser.role, ["RECEPCIONISTA", "ADMINISTRADOR"])) {
    return errorResponse("No autorizado.", 403);
  }

  const { searchParams } = new URL(request.url);
  const monthParam = parseMonthInput(searchParams.get("month"));
  if (!monthParam) {
    return errorResponse("Mes inválido.", 400);
  }

  const timeZone = getAnalyticsTimeZone();
  const rangeStart = fromZonedDateParts(
    {
      year: monthParam.year,
      month: monthParam.month,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
    },
    timeZone,
  );

  const nextMonth =
    monthParam.month === 12
      ? { year: monthParam.year + 1, month: 1 }
      : { year: monthParam.year, month: monthParam.month + 1 };
  const rangeEnd = fromZonedDateParts(
    {
      year: nextMonth.year,
      month: nextMonth.month,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
    },
    timeZone,
  );

  const prisma = getPrismaClient();
  const appointments = await prisma.appointment.findMany({
    where: { timeSlot: { startAt: { gte: rangeStart, lt: rangeEnd } } },
    select: { status: true, checkedInAt: true, timeSlot: { select: { startAt: true } } },
  });

  const days = new Map<
    string,
    { date: string; total: number; pending: number; confirmed: number; cancelled: number; checkedIn: number }
  >();

  for (const appointment of appointments) {
    const dateKey = formatDateInput(appointment.timeSlot.startAt, timeZone);
    if (!days.has(dateKey)) {
      days.set(dateKey, {
        date: dateKey,
        total: 0,
        pending: 0,
        confirmed: 0,
        cancelled: 0,
        checkedIn: 0,
      });
    }
    const entry = days.get(dateKey)!;
    entry.total += 1;
    if (appointment.status === AppointmentStatus.PENDING) {
      entry.pending += 1;
    }
    if (appointment.status === AppointmentStatus.CONFIRMED) {
      entry.confirmed += 1;
    }
    if (appointment.status === AppointmentStatus.CANCELLED) {
      entry.cancelled += 1;
    }
    if (appointment.checkedInAt) {
      entry.checkedIn += 1;
    }
  }

  const daysArray = Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    range: {
      from: formatDateInput(rangeStart, timeZone),
      to: formatDateInput(addDaysZoned(rangeEnd, -1, timeZone), timeZone),
    },
    days: daysArray,
  });
}
