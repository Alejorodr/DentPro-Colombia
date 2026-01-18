import { NextResponse } from "next/server";
import { z } from "zod";

import { getPrismaClient } from "@/lib/prisma";
import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { createReceptionNotifications } from "@/lib/notifications";
import { TimeSlotStatus } from "@prisma/client";
import { getRequestId } from "@/app/api/_utils/request";
import { logger } from "@/lib/logger";
import { requireOwnershipOrRole, requireRole, requireSession } from "@/lib/authz";
import * as Sentry from "@sentry/nextjs";

const rescheduleSchema = z.object({
  timeSlotId: z.string().uuid(),
});

function canRescheduleWithLimit(startAt: Date): boolean {
  const diff = startAt.getTime() - Date.now();
  return diff >= 24 * 60 * 60 * 1000;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  const startedAt = Date.now();
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    logger.warn({
      event: "appointment.reschedule.unauthorized",
      route: "/api/appointments/[id]/reschedule",
      requestId,
      status: sessionResult.error.status,
    });
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, [
    "PACIENTE",
    "PROFESIONAL",
    "RECEPCIONISTA",
    "ADMINISTRADOR",
  ]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const { id } = await params;
  logger.info({
    event: "appointment.reschedule.start",
    route: "/api/appointments/[id]/reschedule",
    requestId,
    userId: sessionResult.user.id,
  });

  const { data: payload, error } = await parseJson(request, rescheduleSchema);
  if (error) {
    return error;
  }

  const prisma = getPrismaClient();
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { timeSlot: true },
  });

  if (!appointment) {
    return errorResponse("Cita no encontrada.", 404);
  }

  if (sessionResult.user.role === "PACIENTE") {
    const patient = await prisma.patientProfile.findUnique({ where: { userId: sessionResult.user.id } });
    const ownershipError = requireOwnershipOrRole({
      user: sessionResult.user,
      ownerId: patient?.userId,
      rolesAllowed: ["ADMINISTRADOR", "RECEPCIONISTA"],
    });
    if (!patient || appointment.patientId !== patient.id || ownershipError) {
      return errorResponse("No autorizado.", 403);
    }

    if (!canRescheduleWithLimit(appointment.timeSlot.startAt)) {
      return errorResponse("Solo puedes reprogramar con 24h de anticipación.", 409);
    }
  }

  if (sessionResult.user.role === "PROFESIONAL") {
    const professional = await prisma.professionalProfile.findUnique({ where: { userId: sessionResult.user.id } });
    if (!professional || appointment.professionalId !== professional.id) {
      return errorResponse("No autorizado.", 403);
    }
  }

  if (["RECEPCIONISTA", "ADMINISTRADOR"].includes(sessionResult.user.role)) {
    // sin restricciones
  }

  const newSlot = await prisma.timeSlot.findUnique({ where: { id: payload.timeSlotId } });

  if (!newSlot) {
    return errorResponse("Nuevo slot no encontrado.", 404);
  }

  if (newSlot.status !== TimeSlotStatus.AVAILABLE) {
    return errorResponse("El nuevo slot no está disponible.", 409);
  }

  try {
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

    logger.info({
      event: "appointment.reschedule.success",
      route: "/api/appointments/[id]/reschedule",
      requestId,
      userId: sessionResult.user.id,
      appointmentId: updated.id,
      status: 200,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(updated);
  } catch (error) {
    Sentry.captureException(error);
    logger.error({
      event: "appointment.reschedule.failed",
      route: "/api/appointments/[id]/reschedule",
      requestId,
      userId: sessionResult.user.id,
      status: 500,
      durationMs: Date.now() - startedAt,
      error,
    });
    return errorResponse("No se pudo reprogramar la cita.", 500);
  }
}
