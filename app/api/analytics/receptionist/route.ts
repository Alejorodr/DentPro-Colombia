import { NextResponse } from "next/server";

import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";
import {
  addDaysZoned,
  formatDateInput,
  fromZonedDateParts,
  getAnalyticsTimeZone,
  startOfZonedDay,
} from "@/lib/dates/tz";
import { AppointmentStatus, TimeSlotStatus } from "@prisma/client";

function parseDateInput(value?: string | null) {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return { year, month, day };
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
  const timeZone = getAnalyticsTimeZone();
  const fromParam = parseDateInput(searchParams.get("from"));
  const toParam = parseDateInput(searchParams.get("to"));
  const dateParam = parseDateInput(searchParams.get("date"));
  const rawPage = Number(searchParams.get("page") ?? "1");
  const rawPageSize = Number(searchParams.get("pageSize") ?? "8");
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize > 0 ? rawPageSize : 8;

  const baseDate = startOfZonedDay(new Date(), timeZone);
  const fromDate = fromParam
    ? fromZonedDateParts({ ...fromParam, hour: 0, minute: 0, second: 0 }, timeZone)
    : baseDate;
  const toDate = toParam
    ? fromZonedDateParts({ ...toParam, hour: 0, minute: 0, second: 0 }, timeZone)
    : fromDate;

  const rangeStart = startOfZonedDay(fromDate, timeZone);
  const rangeEnd = addDaysZoned(startOfZonedDay(toDate, timeZone), 1, timeZone);

  const staffDate = dateParam
    ? fromZonedDateParts({ ...dateParam, hour: 0, minute: 0, second: 0 }, timeZone)
    : rangeStart;
  const staffStart = startOfZonedDay(staffDate, timeZone);
  const staffEnd = addDaysZoned(staffStart, 1, timeZone);

  const prisma = getPrismaClient();
  const [totalAppointments, statusRows, checkedInCount, appointments, staffProfiles] = await Promise.all([
    prisma.appointment.count({
      where: { timeSlot: { startAt: { gte: rangeStart, lt: rangeEnd } } },
    }),
    prisma.appointment.groupBy({
      by: ["status"],
      where: { timeSlot: { startAt: { gte: rangeStart, lt: rangeEnd } } },
      _count: { status: true },
    }),
    prisma.appointment.count({
      where: { checkedInAt: { not: null }, timeSlot: { startAt: { gte: rangeStart, lt: rangeEnd } } },
    }),
    prisma.appointment.findMany({
      where: { timeSlot: { startAt: { gte: rangeStart, lt: rangeEnd } } },
      include: {
        patient: { include: { user: true } },
        professional: { include: { user: true, specialty: true } },
        timeSlot: true,
        service: true,
      },
      orderBy: { timeSlot: { startAt: "asc" } },
      skip: Math.max((page - 1) * pageSize, 0),
      take: Math.min(Math.max(pageSize, 1), 20),
    }),
    prisma.professionalProfile.findMany({
      where: { active: true },
      include: {
        user: true,
        specialty: true,
        timeSlots: {
          where: { startAt: { gte: staffStart, lt: staffEnd } },
          select: { status: true, startAt: true, endAt: true },
        },
      },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const statusCounts = Object.values(AppointmentStatus).reduce(
    (acc, status) => ({ ...acc, [status]: 0 }),
    {} as Record<AppointmentStatus, number>,
  );

  for (const row of statusRows) {
    statusCounts[row.status] = row._count.status;
  }

  const todayLabel = formatDateInput(new Date(), timeZone);
  const staffLabel = formatDateInput(staffStart, timeZone);
  const referenceTime =
    todayLabel === staffLabel ? new Date() : new Date((staffStart.getTime() + staffEnd.getTime()) / 2);

  const staffOnDuty = staffProfiles.map((profile) => {
    const slots = profile.timeSlots;
    if (slots.length === 0) {
      return {
        id: profile.id,
        name: `${profile.user.name} ${profile.user.lastName}`,
        specialty: profile.specialty?.name ?? null,
        status: "Offline" as const,
        slots: 0,
      };
    }

    const sortedSlots = [...slots].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    const firstStart = sortedSlots[0].startAt;
    const lastEnd = sortedSlots[sortedSlots.length - 1].endAt;
    const currentSlot = sortedSlots.find(
      (slot) => referenceTime >= slot.startAt && referenceTime < slot.endAt,
    );

    let availability: "Free" | "Busy" | "Break" | "Offline" = "Offline";

    if (currentSlot) {
      availability =
        currentSlot.status === TimeSlotStatus.BOOKED
          ? "Busy"
          : currentSlot.status === TimeSlotStatus.BREAK
            ? "Break"
            : "Free";
    } else if (referenceTime >= firstStart && referenceTime < lastEnd) {
      availability = slots.some((slot) => slot.status === TimeSlotStatus.BREAK) ? "Break" : "Free";
    }

    return {
      id: profile.id,
      name: `${profile.user.name} ${profile.user.lastName}`,
      specialty: profile.specialty?.name ?? null,
      status: availability,
      slots: slots.length,
    };
  });

  const totalPages = Math.max(Math.ceil(totalAppointments / pageSize), 1);

  return NextResponse.json({
    range: {
      from: formatDateInput(rangeStart, timeZone),
      to: formatDateInput(addDaysZoned(rangeEnd, -1, timeZone), timeZone),
    },
    metrics: {
      totalAppointments,
      pending: statusCounts[AppointmentStatus.PENDING] ?? 0,
      confirmed: statusCounts[AppointmentStatus.CONFIRMED] ?? 0,
      checkedIn: checkedInCount,
      cancellations: statusCounts[AppointmentStatus.CANCELLED] ?? 0,
    },
    appointments: appointments.map((appointment) => ({
      id: appointment.id,
      status: appointment.status,
      startAt: appointment.timeSlot.startAt,
      endAt: appointment.timeSlot.endAt,
      patient: appointment.patient
        ? {
            id: appointment.patient.id,
            name: `${appointment.patient.user.name} ${appointment.patient.user.lastName}`,
          }
        : null,
      professional: appointment.professional
        ? {
            id: appointment.professional.id,
            name: `${appointment.professional.user.name} ${appointment.professional.user.lastName}`,
            specialty: appointment.professional.specialty?.name ?? null,
          }
        : null,
      service: appointment.service
        ? {
            id: appointment.service.id,
            name: appointment.service.name,
          }
        : { id: "", name: appointment.reason },
      reason: appointment.reason,
    })),
    pagination: {
      page: Math.min(Math.max(page, 1), totalPages),
      pageSize,
      total: totalAppointments,
      totalPages,
    },
    staffOnDuty,
  });
}
