import { NextResponse } from "next/server";

import { getSessionUser } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { addDaysZoned, fromZonedDateParts, getAnalyticsTimeZone } from "@/lib/dates/tz";
import { getEffectiveAvailability } from "@/lib/scheduling/effective-availability";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");

  if (!dateParam) {
    return NextResponse.json(
      { error: "Ruta legacy: usa /api/slots?date=YYYY-MM-DD&professionalId=... para disponibilidad operativa." },
      { status: 410 },
    );
  }

  const [year, month, day] = dateParam.split("-").map(Number);
  if (!year || !month || !day) {
    return errorResponse("Fecha inválida.", 400);
  }

  const timeZone = getAnalyticsTimeZone();
  const startAt = fromZonedDateParts({ year, month, day, hour: 0, minute: 0, second: 0 }, timeZone);
  const endAt = addDaysZoned(startAt, 1, timeZone);

  const serviceId = searchParams.get("serviceId") ?? undefined;
  const effective = await getEffectiveAvailability({
    dateStart: startAt,
    dateEnd: endAt,
    professionalId: id,
    serviceId,
  });

  return NextResponse.json(effective.slots);
}
