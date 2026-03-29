import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { getAnalyticsTimeZone } from "@/lib/dates/tz";
import { getEffectiveAvailability } from "@/lib/scheduling/effective-availability";

const querySchema = z.object({
  serviceId: z.string().uuid(),
  professionalId: z.string().uuid().optional(),
  from: z.string().datetime(),
  to: z.string().datetime(),
  includeReasons: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((value) => value === "true"),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    serviceId: searchParams.get("serviceId") ?? undefined,
    professionalId: searchParams.get("professionalId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    includeReasons: searchParams.get("includeReasons") ?? undefined,
  });

  if (!parsed.success) {
    return errorResponse("Parámetros inválidos.", 400);
  }

  const from = new Date(parsed.data.from);
  const to = new Date(parsed.data.to);
  if (to <= from) {
    return errorResponse("Rango de fechas inválido.", 400);
  }

  const effective = await getEffectiveAvailability({
    dateStart: from,
    dateEnd: to,
    serviceId: parsed.data.serviceId,
    professionalId: parsed.data.professionalId,
    includeReasons: parsed.data.includeReasons,
  });

  const ranges = Object.fromEntries(
    [...effective.effectiveRangesByProfessional.entries()].map(([professionalId, intervals]) => [
      professionalId,
      intervals.map((interval) => ({ startAt: interval.startAt.toISOString(), endAt: interval.endAt.toISOString() })),
    ]),
  );

  return NextResponse.json({
    timeZone: getAnalyticsTimeZone(),
    from: from.toISOString(),
    to: to.toISOString(),
    slots: effective.slots,
    effectiveRanges: ranges,
    reasons: parsed.data.includeReasons ? Object.fromEntries(effective.reasons?.entries() ?? []) : undefined,
  });
}
