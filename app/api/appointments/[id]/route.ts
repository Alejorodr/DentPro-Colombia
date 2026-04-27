import { NextResponse } from "next/server";
import { z } from "zod";

import { getPrismaClient, isDatabaseUnavailableError } from "@/lib/prisma";
import { errorResponse, serviceUnavailableResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getRequestId } from "@/app/api/_utils/request";
import { createReceptionNotifications } from "@/lib/notifications";
import { AppointmentStatus, TimeSlotStatus } from "@prisma/client";
import { requireRole, requireSession } from "@/lib/authz";
import { sendAppointmentEmail } from "@/lib/notifications/email";
import { logger } from "@/lib/logger";
import { recordAppointmentEvent } from "@/lib/appointments/events";
import { buildAppointmentStatusNotification } from "@/lib/appointments/activity";
import { appointmentMutationResponseSelect, serializeAppointmentMutationResponse } from "@/lib/appointments/response";

const updateAppointmentSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
  notes: z.string().max(1000).nullable().optional(),
  action: z.enum(["mark_no_show", "check_in"]).optional(),
});

function canCancelWithLimit(startAt: Date): boolean {
  const diff = startAt.getTime() - Date.now();
  return diff >= 24 * 60 * 60 * 1000;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
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
  logger.info({ event: "appointment.update.start", requestId, appointmentId: id, role: sessionResult.user.role });
  const { data: payload, error } = await parseJson(request, updateAppointmentSchema);
  if (error) {
    logger.warn({ event: "appointment.update.validation_failed", requestId, appointmentId: id });
    return error;
  }

  if (payload.action) {
    const canRunOperationalAction = ["ADMINISTRADOR", "RECEPCIONISTA", "PROFESIONAL"].includes(sessionResult.user.role);
    if (!canRunOperationalAction) {
      return errorResponse("No autorizado para esta acción.", 403);
    }
  }

  try {
    const prisma = getPrismaClient();
    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        ...(sessionResult.user.role === "PACIENTE"
          ? { patient: { userId: sessionResult.user.id } }
          : sessionResult.user.role === "PROFESIONAL"
            ? { professional: { userId: sessionResult.user.id } }
            : {}),
      },
      select: {
        id: true,
        status: true,
        checkedInAt: true,
        timeSlotId: true,
        timeSlot: { select: { startAt: true } },
      },
    });

    if (!appointment) {
      return errorResponse("Cita no encontrada.", 404);
    }

    if (sessionResult.user.role === "PACIENTE") {
      if (payload.status !== AppointmentStatus.CANCELLED) {
        return errorResponse("Solo puedes cancelar tus citas.", 403);
      }

      if (!canCancelWithLimit(appointment.timeSlot.startAt)) {
        return errorResponse("Solo puedes cancelar con 24h de anticipación.", 409);
      }
    }

    if (sessionResult.user.role === "PROFESIONAL") {
      const allowedStatuses = new Set<AppointmentStatus>([AppointmentStatus.CONFIRMED, AppointmentStatus.CHECKED_IN, AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW, AppointmentStatus.CANCELLED]);
      if (!allowedStatuses.has(payload.status)) {
        return errorResponse("No autorizado para este estado.", 403);
      }
    }

    if (["RECEPCIONISTA", "ADMINISTRADOR"].includes(sessionResult.user.role)) {
      // Sin restricciones adicionales.
    }

    const previousStatus = appointment.status;
    const previousSlotId = appointment.timeSlotId;
    const isNoShowAction = payload.action === "mark_no_show";
    const isCheckInAction = payload.action === "check_in";
    const nextStatus = isNoShowAction
      ? AppointmentStatus.NO_SHOW
      : isCheckInAction
        ? AppointmentStatus.CHECKED_IN
        : payload.status;

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: nextStatus,
        notes: payload.notes ?? undefined,
        checkedInAt: nextStatus === AppointmentStatus.CHECKED_IN ? appointment.checkedInAt ?? new Date() : null,
        timeSlot: {
          update: {
            status:
              nextStatus === AppointmentStatus.CANCELLED || nextStatus === AppointmentStatus.NO_SHOW
                ? TimeSlotStatus.AVAILABLE
                : TimeSlotStatus.BOOKED,
          },
        },
      },
      select: appointmentMutationResponseSelect,
    });

    if (previousStatus !== updated.status) {
      const patientName = updated.patient ? `${updated.patient.user.name} ${updated.patient.user.lastName}` : "Paciente";
      const professionalName = updated.professional
        ? `${updated.professional.user.name} ${updated.professional.user.lastName}`
        : "Profesional";
      const notification = buildAppointmentStatusNotification(updated.status);

      await createReceptionNotifications({
        type: notification.type,
        title: notification.title,
        body: `${notification.activity} Turno de ${patientName} con ${professionalName}.`,
        entityType: "appointment",
        entityId: updated.id,
      });
    }

    if (previousStatus !== AppointmentStatus.CANCELLED && updated.status === AppointmentStatus.CANCELLED) {
      try {
        await sendAppointmentEmail("cancellation", updated);
      } catch (emailError) {
        logger.warn(
          {
            event: "appointment.email.skipped",
            appointmentId: updated.id,
            error: emailError,
          },
          "No se pudo enviar email de cancelación.",
        );
      }
    }

    await recordAppointmentEvent({
      appointmentId: updated.id,
      action: isNoShowAction ? "marked_no_show" : isCheckInAction ? "checked_in" : "status_updated",
      actorUserId: sessionResult.user.id,
      actorRole: sessionResult.user.role,
      previousStatus,
      newStatus: updated.status,
      metadata: { previousSlotId, newSlotId: updated.timeSlotId },
    });

    logger.info({ event: "appointment.update.success", requestId, appointmentId: updated.id, status: updated.status });
    logger.info({
      event: "appointment.audit.status_changed",
      requestId,
      actorUserId: sessionResult.user.id,
      actorRole: sessionResult.user.role,
      appointmentId: updated.id,
      fromStatus: previousStatus,
      toStatus: updated.status,
      action: isNoShowAction ? "mark_no_show" : isCheckInAction ? "check_in" : "status_update",
      result: "success",
      previousSlotId,
      newSlotId: updated.timeSlotId,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(serializeAppointmentMutationResponse(updated));
  } catch (error) {
    logger.error({ event: "appointment.update.failed", requestId, error });
    if (isDatabaseUnavailableError(error)) {
      return serviceUnavailableResponse("Base de datos temporalmente no disponible.", error.retryAfterMs);
    }
    throw error;
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
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
  logger.info({ event: "appointment.cancel.start", requestId, appointmentId: id, role: sessionResult.user.role });
  try {
    const prisma = getPrismaClient();
    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        ...(sessionResult.user.role === "PACIENTE"
          ? { patient: { userId: sessionResult.user.id } }
          : sessionResult.user.role === "PROFESIONAL"
            ? { professional: { userId: sessionResult.user.id } }
            : {}),
      },
      select: {
        id: true,
        status: true,
        timeSlot: { select: { startAt: true } },
      },
    });

    if (!appointment) {
      return errorResponse("Cita no encontrada.", 404);
    }

    if (sessionResult.user.role === "PACIENTE") {
      if (!canCancelWithLimit(appointment.timeSlot.startAt)) {
        return errorResponse("Solo puedes cancelar con 24h de anticipación.", 409);
      }
    }

    if (sessionResult.user.role === "PROFESIONAL") {
      // La propiedad ya está acotada en la consulta.
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        timeSlot: {
          update: { status: TimeSlotStatus.AVAILABLE },
        },
      },
      select: appointmentMutationResponseSelect,
    });

    const patientName = `${updated.patient?.user.name ?? "Paciente"} ${updated.patient?.user.lastName ?? ""}`.trim();
    const professionalName = `${updated.professional?.user.name ?? "Profesional"} ${updated.professional?.user.lastName ?? ""}`.trim();

    await createReceptionNotifications({
      type: "appointment_cancelled",
      title: "Cita cancelada",
      body: `Se canceló la cita de ${patientName} con ${professionalName}.`,
      entityType: "appointment",
      entityId: updated.id,
    });

    try {
      await sendAppointmentEmail("cancellation", updated);
    } catch (emailError) {
      logger.warn(
        {
          event: "appointment.email.skipped",
          appointmentId: updated.id,
          error: emailError,
        },
        "No se pudo enviar email de cancelación.",
      );
    }

    await recordAppointmentEvent({
      appointmentId: updated.id,
      action: "cancelled",
      actorUserId: sessionResult.user.id,
      actorRole: sessionResult.user.role,
      previousStatus: appointment.status,
      newStatus: AppointmentStatus.CANCELLED,
    });

    logger.info({ event: "appointment.cancel.success", requestId, appointmentId: updated.id });
    logger.info({
      event: "appointment.audit.cancelled",
      requestId,
      actorUserId: sessionResult.user.id,
      actorRole: sessionResult.user.role,
      appointmentId: updated.id,
      action: "cancel",
      result: "success",
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(serializeAppointmentMutationResponse(updated));
  } catch (error) {
    logger.error({ event: "appointment.cancel.failed", requestId, error });
    if (isDatabaseUnavailableError(error)) {
      return serviceUnavailableResponse("Base de datos temporalmente no disponible.", error.retryAfterMs);
    }
    throw error;
  }
}
