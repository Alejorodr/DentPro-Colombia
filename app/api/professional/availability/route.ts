import { NextResponse } from "next/server";

import { errorResponse } from "@/app/api/_utils/response";
import { requireRole, requireSession } from "@/lib/authz";
import { addDaysZoned, formatDateInput, fromZonedDateParts, getAnalyticsTimeZone } from "@/lib/dates/tz";
import { getPrismaClient } from "@/lib/prisma";
import { getEffectiveAvailability } from "@/lib/scheduling/effective-availability";

function getRangeFromQuery(rangeParam: string | null) {
  const days = Math.min(Number(rangeParam ?? "30"), 60);
  const timeZone = getAnalyticsTimeZone();
  const now = new Date();
  const parts = {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
  };
  const start = fromZonedDateParts({ ...parts, hour: 0, minute: 0, second: 0 }, timeZone);
  const end = addDaysZoned(start, days, timeZone);
  return { start, end };
}

export async function GET(request: Request) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["PROFESIONAL"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({
    where: { userId: sessionResult.user.id },
  });

  if (!professional) {
    return NextResponse.json({ baselineSchedules: [], adjustments: [], unavailability: [], slots: [] });
  }

  const { searchParams } = new URL(request.url);
  const { start, end } = getRangeFromQuery(searchParams.get("range"));

  const [baselineSchedules, adjustments, unavailability, effective] = await Promise.all([
    prisma.professionalWorkingSchedule.findMany({
      where: { professionalId: professional.id, active: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.professionalScheduleAdjustment.findMany({
      where: { professionalId: professional.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.professionalUnavailability.findMany({
      where: { professionalId: professional.id },
      orderBy: { startsAt: "asc" },
      take: 100,
    }),
    getEffectiveAvailability({
      dateStart: start,
      dateEnd: end,
      professionalId: professional.id,
    }),
  ]);

  return NextResponse.json({
    legacy: {
      deprecated: true,
      message: "Este endpoint es un wrapper de compatibilidad sobre el modelo canónico de scheduling.",
    },
    range: {
      start: formatDateInput(start, getAnalyticsTimeZone()),
      end: formatDateInput(end, getAnalyticsTimeZone()),
    },
    baselineSchedules,
    adjustments,
    unavailability,
    slots: effective.slots.map((slot) => ({
      id: slot.id,
      startAt: slot.startAt.toISOString(),
      endAt: slot.endAt.toISOString(),
    })),
  });
}

export async function POST() {
  return errorResponse(
    "Ruta legacy deshabilitada. Usa /api/professional/schedule para ajustes operativos y novedades.",
    410,
  );
}
