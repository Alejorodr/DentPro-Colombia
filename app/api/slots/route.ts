import { NextResponse } from "next/server";

import { addDaysZoned, formatDateInput, fromZonedDateParts, getAnalyticsTimeZone } from "@/lib/dates/tz";
import { getAppointmentBufferMinutes, hasBufferConflict } from "@/lib/appointments/scheduling";
import { getPrismaClient } from "@/lib/prisma";
import { TimeSlotStatus } from "@prisma/client";
import { getEffectiveAvailability } from "@/lib/scheduling/effective-availability";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId") ?? undefined;
  const dateParam = searchParams.get("date");
  const includeReasons = searchParams.get("includeReasons") === "true";

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
  if (serviceId) {
    const service = await prisma.service.findUnique({ where: { id: serviceId }, select: { active: true } });
    if (!service || !service.active) {
      return NextResponse.json({ error: "Servicio no disponible." }, { status: 404 });
    }
  }

  const effective = await getEffectiveAvailability({
    dateStart: startAt,
    dateEnd: endAt,
    serviceId,
    includeReasons,
  });

  let slots = [...effective.slots];
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
      select: { id: true, professionalId: true, startAt: true, endAt: true },
    });

    const bookedByProfessional = bookedSlots.reduce((acc, slot) => {
      const list = acc.get(slot.professionalId) ?? [];
      list.push(slot);
      acc.set(slot.professionalId, list);
      return acc;
    }, new Map<string, Array<{ id: string; startAt: Date; endAt: Date }>>());

    slots = slots.filter((slot) => {
      const booked = bookedByProfessional.get(slot.professionalId) ?? [];
      const conflict = hasBufferConflict({ startAt: slot.startAt, endAt: slot.endAt }, booked, bufferMinutes);
      if (conflict && effective.reasons) {
        const existing = effective.reasons.get(slot.id) ?? [];
        effective.reasons.set(slot.id, [...existing, "PROFESSIONAL_UNAVAILABLE"]);
      }
      return !conflict;
    });
  }

  return NextResponse.json({
    date: formatDateInput(startAt, timeZone),
    slots,
    reasons: includeReasons ? Object.fromEntries(effective.reasons?.entries() ?? []) : undefined,
  });
}
