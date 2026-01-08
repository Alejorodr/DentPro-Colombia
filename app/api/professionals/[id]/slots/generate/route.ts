import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { TimeSlotStatus } from "@prisma/client";

function buildSlots(startAt: Date, endAt: Date, durationMinutes: number) {
  const slots: Array<{ startAt: Date; endAt: Date }> = [];
  let cursor = new Date(startAt);

  while (cursor < endAt) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);
    if (slotEnd > endAt) {
      break;
    }
    slots.push({ startAt: slotStart, endAt: slotEnd });
    cursor = slotEnd;
  }

  return slots;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (!isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No tienes permisos para generar slots.", 403);
  }

  const payload = (await request.json().catch(() => null)) as {
    startAt?: string;
    endAt?: string;
    slotDurationMinutes?: number;
  } | null;

  if (!payload?.startAt || !payload?.endAt) {
    return errorResponse("Debe indicar rango de fechas.");
  }

  const startAt = new Date(payload.startAt);
  const endAt = new Date(payload.endAt);

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || startAt >= endAt) {
    return errorResponse("Rango de fechas inválido.");
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({
    where: { id: params.id },
    include: { specialty: true },
  });

  if (!professional) {
    return errorResponse("Profesional no encontrado.", 404);
  }

  const duration = payload.slotDurationMinutes ?? professional.slotDurationMinutes ?? professional.specialty.defaultSlotDurationMinutes;

  if (!Number.isFinite(duration) || duration <= 0) {
    return errorResponse("Duración inválida.");
  }

  const slots = buildSlots(startAt, endAt, duration);

  const created = await prisma.timeSlot.createMany({
    data: slots.map((slot) => ({
      professionalId: professional.id,
      startAt: slot.startAt,
      endAt: slot.endAt,
      status: TimeSlotStatus.AVAILABLE,
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({ created: created.count });
}
