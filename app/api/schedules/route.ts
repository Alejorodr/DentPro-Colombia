import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import type { ScheduleSlot } from "@/lib/api/types";
import { errorResponse } from "@/app/api/_utils/response";
import { requireSession } from "@/lib/authz";
import { getPatientBookingCutoff } from "@/lib/appointments/booking-limits";

// Ventana acotada: antes devolvía todo el historial de todas las agendas (incluida la
// ocupación) a cualquier usuario autenticado.
const WINDOW_DAYS = 30;
const MAX_SLOTS = 500;

export async function GET() {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const prisma = getPrismaClient();
  const { role, id: userId } = sessionResult.user;
  const now = new Date();
  const until = new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);

  try {
    let professionalId: string | undefined;
    if (role === "PROFESIONAL") {
      const professional = await prisma.professionalProfile.findUnique({ where: { userId }, select: { id: true } });
      if (!professional) return NextResponse.json([]);
      professionalId = professional.id;
    }

    const slots = await prisma.timeSlot.findMany({
      where: {
        startAt: { gt: role === "PACIENTE" ? getPatientBookingCutoff(now) : now, lte: until },
        // Los pacientes no ven la ocupación de las agendas, solo lo que pueden reservar.
        ...(role === "PACIENTE" ? { status: "AVAILABLE" as const } : {}),
        ...(professionalId ? { professionalId } : {}),
      },
      take: MAX_SLOTS,
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
