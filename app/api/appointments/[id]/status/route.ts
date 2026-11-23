import { NextResponse } from "next/server";
import { z } from "zod";
import { AppointmentStatus as PrismaAppointmentStatus, TimeSlotStatus } from "@prisma/client";

import { requireRole, requireSession } from "@/lib/authz";
import { getPrismaClient } from "@/lib/prisma";
import { errorResponse } from "@/app/api/_utils/response";
import { logAuditEvent } from "@/lib/audit";
import type { AppointmentStatus } from "@/lib/api/types";
import { parseJson } from "@/app/api/_utils/validation";
import { buildError, fromPrismaStatus, toAppointmentSummary, toPrismaStatus } from "../../utils";

const transitionRules: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["cancelled"],
  cancelled: [],
};

// DOG-19: un body `null` o sin `status` antes terminaba en 500; zod lo rechaza con 400.
const statusSchema = z.object({ status: z.enum(["pending", "confirmed", "cancelled"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR", "RECEPCIONISTA"]);
  if (roleError) {
    return errorResponse("No autorizado.", roleError.status);
  }

  const prisma = getPrismaClient();

  const params = await context.params;
  const appointmentId = params?.id;
  if (!appointmentId) {
    return buildError("Debes especificar una cita válida.");
  }

  const { data: payload, error } = await parseJson(request, statusSchema);
  if (error) {
    return buildError("El estado solicitado no es válido.", 400);
  }

  const nextStatus: AppointmentStatus = payload.status;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    return buildError("La cita no existe.", 404);
  }

  const currentStatus = fromPrismaStatus(appointment.status ?? "");
  const allowedTransitions = transitionRules[currentStatus];

  if (!allowedTransitions.includes(nextStatus)) {
    return buildError(
      "No es posible cambiar el estado actual a la opción solicitada. Verifica el flujo de confirmación/cancelación.",
      400,
    );
  }

  try {
    const prismaNextStatus = toPrismaStatus(nextStatus);
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: prismaNextStatus },
        include: {
          patient: { include: { user: { select: { name: true, lastName: true } } } },
          professional: { include: { user: { select: { name: true, lastName: true } } } },
        },
      });

      // Cancelling releases the slot so it can be booked again (the partial unique index
      // only counts non-cancelled appointments). Transitions out of CANCELLED are not allowed.
      if (prismaNextStatus === PrismaAppointmentStatus.CANCELLED && result.timeSlotId) {
        await tx.timeSlot.updateMany({
          where: { id: result.timeSlotId, status: TimeSlotStatus.BOOKED },
          data: { status: TimeSlotStatus.AVAILABLE },
        });
      }

      return result;
    });

    const patientName = updated.patient?.user
      ? `${updated.patient.user.name} ${updated.patient.user.lastName}`.trim()
      : undefined;
    const profName = updated.professional?.user
      ? `${updated.professional.user.name} ${updated.professional.user.lastName}`.trim()
      : undefined;

    await logAuditEvent({
      actor: { userId: sessionResult.user.id, role: sessionResult.user.role },
      action: "appointment.status.changed",
      resourceType: "appointment",
      resourceId: updated.id,
      targetLabel: patientName || updated.id,
      status: "success",
      metadata: {
        previousStatus: currentStatus,
        newStatus: nextStatus,
      },
    });

    return NextResponse.json(
      toAppointmentSummary({
        id: updated.id,
        patientId: updated.patientId,
        specialistId: updated.professionalId,
        scheduleId: updated.timeSlotId,
        service: updated.serviceName ?? updated.serviceId,
        scheduledAt: updated.createdAt,
        status: updated.status,
        preferredDate: null,
        patient: patientName ? { name: patientName } : null,
        specialist: { id: updated.professionalId, name: profName },
      }),
    );
  } catch (error) {
    console.error("Failed to update appointment status", error);
    await logAuditEvent({
      actor: { userId: sessionResult.user.id, role: sessionResult.user.role },
      action: "appointment.status.changed",
      resourceType: "appointment",
      resourceId: appointmentId,
      status: "failure",
    });
    return buildError("No se pudo actualizar el estado de la cita.", 500);
  }
}
