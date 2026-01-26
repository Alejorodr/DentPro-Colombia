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
import { getAppointmentBufferMinutes, hasBufferConflict } from "@/lib/appointments/scheduling";
import { sendAppointmentEmail } from "@/lib/notifications/email";
import * as Sentry from "@sentry/nextjs";

const rescheduleSchema = z
  .object({
    timeSlotId: z.string().uuid().optional(),
    slotId: z.string().uuid().optional(),
  })
  .refine((data) => data.timeSlotId || data.slotId, {
    message: "timeSlotId es requerido.",
    path: ["timeSlotId"],
  });

function canRescheduleWithLimit(startAt: Date): boolean {
  const diff = startAt.getTime() - Date.now();
  return diff >= 24 * 60 * 60 * 1000;
}

async function getSuggestedSlots(
  prisma: ReturnType<typeof getPrismaClient>,
  professionalId: string,
  from: Date,
  excludeSlotId: string,
) {
  const bufferMinutes = getAppointmentBufferMinutes();
  const bufferMs = bufferMinutes * 60_000;
  const rangeEnd = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);

  const candidates = await prisma.timeSlot.findMany({
    where: {
      professionalId,
      status: TimeSlotStatus.AVAILABLE,
      startAt: { gt: from, lt: rangeEnd },
    },
    orderBy: { startAt: "asc" },
    take: 6,
    select: { id: true, startAt: true, endAt: true },
  });

  if (bufferMinutes <= 0 || candidates.length === 0) {
    return candidates;
  }

  const bookedSlots = await prisma.timeSlot.findMany({
    where: {
      professionalId,
      status: TimeSlotStatus.BOOKED,
      id: { not: excludeSlotId },
      startAt: { lt: new Date(rangeEnd.getTime() + bufferMs) },
      endAt: { gt: new Date(from.getTime() - bufferMs) },
    },
    select: { startAt: true, endAt: true },
  });

  return candidates.filter((candidate) =>
    !hasBufferConflict({ startAt: candidate.startAt, endAt: candidate.endAt }, bookedSlots, bufferMinutes),
  );
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

  const requestedSlotId = payload.timeSlotId ?? payload.slotId;
  const newSlot = await prisma.timeSlot.findUnique({ where: { id: requestedSlotId } });

  if (!newSlot) {
    return errorResponse("Nuevo slot no encontrado.", 404);
  }

  if (newSlot.status !== TimeSlotStatus.AVAILABLE) {
    const suggestions = await getSuggestedSlots(prisma, newSlot.professionalId, newSlot.startAt, appointment.timeSlotId);
    return NextResponse.json(
      {
        error: "El nuevo slot no está disponible.",
        suggestions,
      },
      { status: 409 },
    );
  }

  const bufferMinutes = getAppointmentBufferMinutes();
  if (bufferMinutes > 0) {
    const bufferMs = bufferMinutes * 60_000;
    const bufferStart = new Date(newSlot.startAt.getTime() - bufferMs);
    const bufferEnd = new Date(newSlot.endAt.getTime() + bufferMs);
    const bookedSlots = await prisma.timeSlot.findMany({
      where: {
        professionalId: newSlot.professionalId,
        status: TimeSlotStatus.BOOKED,
        id: { not: appointment.timeSlotId },
        startAt: { lt: bufferEnd },
        endAt: { gt: bufferStart },
      },
      select: { startAt: true, endAt: true },
    });

    const conflict = hasBufferConflict({ startAt: newSlot.startAt, endAt: newSlot.endAt }, bookedSlots, bufferMinutes);
    if (conflict) {
      const suggestions = await getSuggestedSlots(prisma, newSlot.professionalId, newSlot.startAt, appointment.timeSlotId);
      return NextResponse.json(
        {
          error: "El nuevo horario no respeta el buffer entre turnos.",
          suggestions,
        },
        { status: 409 },
      );
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const previousSlotUpdate = await tx.timeSlot.updateMany({
        where: { id: appointment.timeSlotId, status: TimeSlotStatus.BOOKED },
        data: { status: TimeSlotStatus.AVAILABLE },
      });

      if (previousSlotUpdate.count === 0) {
        throw new Error("Slot original modificado");
      }

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

    try {
      await createReceptionNotifications({
        type: "appointment_rescheduled",
        title: "Turno reprogramado",
        body: `Se reprogramó el turno ${updated.id}.`,
        entityType: "appointment",
        entityId: updated.id,
      });
    } catch (notificationError) {
      logger.warn({
        event: "appointment.reschedule.notification_failed",
        route: "/api/appointments/[id]/reschedule",
        requestId,
        appointmentId: updated.id,
        error: notificationError,
      });
    }

    try {
      await sendAppointmentEmail("reschedule", updated);
    } catch (emailError) {
      logger.warn({
        event: "appointment.reschedule.email_failed",
        route: "/api/appointments/[id]/reschedule",
        requestId,
        appointmentId: updated.id,
        error: emailError,
      });
    }

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
