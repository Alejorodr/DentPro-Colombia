import { NextResponse } from "next/server";
import { z } from "zod";

import { getPrismaClient } from "@/lib/prisma";
import { TimeSlotStatus } from "@prisma/client";
import { logger } from "@/lib/logger";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(12).default(6),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsedQuery = querySchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsedQuery.success) {
    logger.warn({ event: "public.slots.validation_failed", issues: parsedQuery.error.flatten() });
    return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
  }

  try {
    const now = new Date();
    const prisma = getPrismaClient();
    const slots = await prisma.timeSlot.findMany({
      where: {
        status: TimeSlotStatus.AVAILABLE,
        startAt: { gte: now },
        professional: { active: true },
      },
      select: {
        id: true,
        startAt: true,
        professional: {
          select: {
            id: true,
            user: { select: { name: true, lastName: true } },
            specialty: { select: { name: true } },
          },
        },
      },
      orderBy: { startAt: "asc" },
      take: parsedQuery.data.limit,
    });

    const payload = slots.map((slot) => ({
      id: slot.id,
      startsAt: slot.startAt.toISOString(),
      professional: `${slot.professional.user.name} ${slot.professional.user.lastName}`.trim(),
      specialty: slot.professional.specialty.name,
    }));

    logger.info({ event: "public.slots.success", limit: parsedQuery.data.limit, returned: payload.length });
    return NextResponse.json(
      { slots: payload, generatedAt: now.toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    logger.error({ event: "public.slots.failed", error });
    return NextResponse.json({ error: "No fue posible consultar disponibilidad." }, { status: 500 });
  }
}
