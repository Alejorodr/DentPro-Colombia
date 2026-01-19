import { NextResponse } from "next/server";
import { z } from "zod";

import { getPrismaClient } from "@/lib/prisma";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { TimeSlotStatus } from "@prisma/client";
import { buildSlotsWithBuffer, getAppointmentBufferMinutes } from "@/lib/appointments/scheduling";

const generateSlotsSchema = z.object({
  startAt: z.string().trim().min(1),
  endAt: z.string().trim().min(1),
  slotDurationMinutes: z.number().int().min(5).max(240).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const { id } = await params;
  if (!isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No tienes permisos para generar slots.", 403);
  }

  const { data: payload, error } = await parseJson(request, generateSlotsSchema);
  if (error) {
    return error;
  }

  const startAt = new Date(payload.startAt);
  const endAt = new Date(payload.endAt);

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || startAt >= endAt) {
    return errorResponse("Rango de fechas inválido.");
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({
    where: { id },
    include: { specialty: true },
  });

  if (!professional) {
    return errorResponse("Profesional no encontrado.", 404);
  }

  const duration = payload.slotDurationMinutes ?? professional.slotDurationMinutes ?? professional.specialty.defaultSlotDurationMinutes;

  if (!Number.isFinite(duration) || duration <= 0) {
    return errorResponse("Duración inválida.");
  }

  const bufferMinutes = getAppointmentBufferMinutes();
  const slots = buildSlotsWithBuffer(startAt, endAt, duration, bufferMinutes);

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
