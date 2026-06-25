import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import type { ScheduleSlot } from "@/lib/api/types";

export async function GET() {
  const prisma = getPrismaClient();

  try {
    const slots = await prisma.timeSlot.findMany({
      orderBy: { startAt: "asc" },
      include: {
        professional: { include: { user: { select: { name: true, lastName: true } } } },
      },
    });

    const payload: ScheduleSlot[] = slots.map((slot) => {
      const user = slot.professional?.user;
      const specialistName = user
        ? `${user.name} ${user.lastName}`.trim() || undefined
        : undefined;
      return {
        id: slot.id,
        specialistId: slot.professionalId,
        specialistName,
        start: slot.startAt.toISOString(),
        end: slot.endAt.toISOString(),
        available: slot.status === "AVAILABLE",
      };
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to fetch schedules", error);
    return NextResponse.json({ error: "No se pudieron cargar los horarios." }, { status: 500 });
  }
}
