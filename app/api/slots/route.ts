import { NextResponse } from "next/server";

import { addDaysZoned, formatDateInput, fromZonedDateParts, getAnalyticsTimeZone } from "@/lib/dates/tz";
import { getPrismaClient } from "@/lib/prisma";
import { getEffectiveAvailability } from "@/lib/scheduling/effective-availability";
import { requireSession } from "@/lib/authz";
import { isSlotBookableByPatient } from "@/lib/appointments/booking-limits";

const STAFF_ROLES = new Set(["PROFESIONAL", "RECEPCIONISTA", "ADMINISTRADOR"]);

async function isStaffCaller() {
  try {
    const result = await requireSession();
    return "user" in result && STAFF_ROLES.has(result.user.role);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId") ?? undefined;
  const professionalId = searchParams.get("professionalId") ?? undefined;
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
    professionalId,
    includeReasons,
  });

  // Patients and anonymous callers only see slots outside the booking lead time
  // window (lib/appointments/booking-limits.ts); staff keep the full list.
  const now = new Date();
  const slots = (await isStaffCaller())
    ? effective.slots
    : effective.slots.filter((slot) => isSlotBookableByPatient(slot.startAt, now));

  return NextResponse.json({
    date: formatDateInput(startAt, timeZone),
    slots,
    reasons: includeReasons ? Object.fromEntries(effective.reasons?.entries() ?? []) : undefined,
  });
}
