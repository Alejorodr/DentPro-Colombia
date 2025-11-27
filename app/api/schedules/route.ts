import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import type { ScheduleSlot } from "@/lib/api/types";

export async function GET() {
  const prisma = getPrismaClient();

  try {
    const schedules = await prisma.schedule.findMany({
      orderBy: { start: "asc" },
    });

    const payload: ScheduleSlot[] = schedules.map((slot) => ({
      id: slot.id,
      specialistId: slot.specialistId,
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      available: slot.available,
    }));

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to fetch schedules", error);
    return NextResponse.json({ error: "No se pudieron cargar los horarios." }, { status: 500 });
  }
}
