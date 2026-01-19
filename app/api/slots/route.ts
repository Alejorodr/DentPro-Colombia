import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import { addDaysZoned, formatDateInput, fromZonedDateParts, getAnalyticsTimeZone } from "@/lib/dates/tz";
import { TimeSlotStatus } from "@prisma/client";
import { getAppointmentBufferMinutes, hasBufferConflict } from "@/lib/appointments/scheduling";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId");
  const dateParam = searchParams.get("date");

  if (!dateParam) {
    return NextResponse.json({ error: "Fecha requerida." }, { status: 400 });
  }

  const timeZone = getAnalyticsTimeZone();
  const [year, month, day] = dateParam.split("-").map(Number);

  if (!year || !month || !day) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }

  const startAt = fromZonedDateParts({ year, month, day, hour: 0, minute: 0, second: 0 }, timeZone);
  const endAt = addDaysZoned(startAt, 1, timeZone);

  const prisma = getPrismaClient();
  const service = serviceId
    ? await prisma.service.findUnique({ where: { id: serviceId }, select: { specialtyId: true, active: true } })
    : null;

  if (serviceId && (!service || !service.active)) {
    return NextResponse.json({ error: "Servicio no disponible." }, { status: 404 });
  }

  let slots = await prisma.timeSlot.findMany({
    where: {
      status: TimeSlotStatus.AVAILABLE,
      startAt: { gte: startAt, lt: endAt },
      professional: {
        active: true,
        ...(service?.specialtyId ? { specialtyId: service.specialtyId } : {}),
      },
    },
    include: {
      professional: { include: { user: true, specialty: true } },
    },
    orderBy: { startAt: "asc" },
  });

  const bufferMinutes = getAppointmentBufferMinutes();
  if (bufferMinutes > 0 && slots.length > 0) {
    const bufferMs = bufferMinutes * 60_000;
    const professionalIds = [...new Set(slots.map((slot) => slot.professionalId))];
    const bookedSlots = await prisma.timeSlot.findMany({
      where: {
        professionalId: { in: professionalIds },
        status: TimeSlotStatus.BOOKED,
        startAt: { lt: new Date(endAt.getTime() + bufferMs) },
        endAt: { gt: new Date(startAt.getTime() - bufferMs) },
      },
      select: { professionalId: true, startAt: true, endAt: true },
    });

    const bookedByProfessional = bookedSlots.reduce((acc, slot) => {
      const list = acc.get(slot.professionalId) ?? [];
      list.push(slot);
      acc.set(slot.professionalId, list);
      return acc;
    }, new Map<string, Array<{ startAt: Date; endAt: Date }>>());

    slots = slots.filter((slot) => {
      const booked = bookedByProfessional.get(slot.professionalId) ?? [];
      return !hasBufferConflict({ startAt: slot.startAt, endAt: slot.endAt }, booked, bufferMinutes);
    });
  }

  return NextResponse.json({
    date: formatDateInput(startAt, timeZone),
    slots,
  });
}
