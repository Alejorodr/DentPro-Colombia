import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { createReceptionNotifications } from "@/lib/notifications";
import { TimeSlotStatus } from "@prisma/client";

function canRescheduleWithLimit(startAt: Date): boolean {
  const diff = startAt.getTime() - Date.now();
  return diff >= 24 * 60 * 60 * 1000;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const { id } = await params;
  const payload = (await request.json().catch(() => null)) as { timeSlotId?: string } | null;

  if (!payload?.timeSlotId) {
    return errorResponse("Nuevo slot obligatorio.");
  }

  const prisma = getPrismaClient();
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { timeSlot: true },
  });

  if (!appointment) {
    return errorResponse("Cita no encontrada.", 404);
  }

  if (sessionUser.role === "PACIENTE") {
    const patient = await prisma.patientProfile.findUnique({ where: { userId: sessionUser.id } });
    if (!patient || appointment.patientId !== patient.id) {
      return errorResponse("No autorizado.", 403);
    }

    if (!canRescheduleWithLimit(appointment.timeSlot.startAt)) {
      return errorResponse("Solo puedes reprogramar con 24h de anticipación.", 409);
    }
  }

  if (sessionUser.role === "PROFESIONAL") {
    const professional = await prisma.professionalProfile.findUnique({ where: { userId: sessionUser.id } });
    if (!professional || appointment.professionalId !== professional.id) {
      return errorResponse("No autorizado.", 403);
    }
  }

  if (isAuthorized(sessionUser.role, ["RECEPCIONISTA", "ADMINISTRADOR"])) {
    // sin restricciones
  }

  const newSlot = await prisma.timeSlot.findUnique({ where: { id: payload.timeSlotId } });

  if (!newSlot) {
    return errorResponse("Nuevo slot no encontrado.", 404);
  }

  if (newSlot.status !== TimeSlotStatus.AVAILABLE) {
    return errorResponse("El nuevo slot no está disponible.", 409);
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.timeSlot.update({
      where: { id: appointment.timeSlotId },
      data: { status: TimeSlotStatus.AVAILABLE },
    });

    const slotUpdate = await tx.timeSlot.updateMany({
      where: { id: newSlot.id, status: TimeSlotStatus.AVAILABLE },
      data: { status: TimeSlotStatus.BOOKED },
    });

    if (slotUpdate.count === 0) {
      throw new Error("Slot ocupado");
    }

    const updatedAppointment = await tx.appointment.update({
      where: { id: appointment.id },
      data: {
        timeSlotId: newSlot.id,
        professionalId: newSlot.professionalId,
      },
      include: {
        patient: { include: { user: true } },
        professional: { include: { user: true, specialty: true } },
        timeSlot: true,
        service: true,
      },
    });

    return updatedAppointment;
  });

  await createReceptionNotifications({
    type: "appointment_rescheduled",
    title: "Turno reprogramado",
    body: `Se reprogramó el turno ${updated.id}.`,
    entityType: "appointment",
    entityId: updated.id,
  });

  return NextResponse.json(updated);
}
