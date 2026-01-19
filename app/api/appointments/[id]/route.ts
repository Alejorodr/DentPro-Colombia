import { NextResponse } from "next/server";
import { z } from "zod";

import { getPrismaClient } from "@/lib/prisma";
import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { createReceptionNotifications } from "@/lib/notifications";
import { AppointmentStatus, TimeSlotStatus } from "@prisma/client";
import { requireOwnershipOrRole, requireRole, requireSession } from "@/lib/authz";
import { sendAppointmentEmail } from "@/lib/appointments/email";

const updateAppointmentSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
  notes: z.string().max(1000).nullable().optional(),
});

function canCancelWithLimit(startAt: Date): boolean {
  const diff = startAt.getTime() - Date.now();
  return diff >= 24 * 60 * 60 * 1000;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  const { data: payload, error } = await parseJson(request, updateAppointmentSchema);
  if (error) {
    return error;
  }

  const prisma = getPrismaClient();
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { timeSlot: true, professional: true, patient: true },
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

    if (payload.status !== AppointmentStatus.CANCELLED) {
      return errorResponse("Solo puedes cancelar tus citas.", 403);
    }

    if (!canCancelWithLimit(appointment.timeSlot.startAt)) {
      return errorResponse("Solo puedes cancelar con 24h de anticipación.", 409);
    }
  }

  if (sessionResult.user.role === "PROFESIONAL") {
    const professional = await prisma.professionalProfile.findUnique({ where: { userId: sessionResult.user.id } });
    if (!professional || appointment.professionalId !== professional.id) {
      return errorResponse("No autorizado.", 403);
    }

    const allowedStatuses = new Set<AppointmentStatus>([AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED]);
    if (!allowedStatuses.has(payload.status)) {
      return errorResponse("No autorizado para este estado.", 403);
    }
  }

  if (["RECEPCIONISTA", "ADMINISTRADOR"].includes(sessionResult.user.role)) {
    // Sin restricciones adicionales.
  }

  const previousStatus = appointment.status;
  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status: payload.status,
      notes: payload.notes ?? undefined,
      checkedInAt:
        payload.status === AppointmentStatus.COMPLETED ? appointment.checkedInAt ?? new Date() : null,
      timeSlot: {
        update: {
          status:
            payload.status === AppointmentStatus.CANCELLED
              ? TimeSlotStatus.AVAILABLE
              : TimeSlotStatus.BOOKED,
        },
      },
    },
    include: {
      patient: { include: { user: true } },
      professional: { include: { user: true, specialty: true } },
      timeSlot: true,
      service: true,
    },
  });

  if (previousStatus !== updated.status) {
    const patientName = updated.patient ? `${updated.patient.user.name} ${updated.patient.user.lastName}` : "Paciente";
    const professionalName = updated.professional
      ? `${updated.professional.user.name} ${updated.professional.user.lastName}`
      : "Profesional";
    const statusLabel =
      updated.status === AppointmentStatus.CANCELLED
        ? "cancelado"
        : updated.status === AppointmentStatus.CONFIRMED
          ? "confirmado"
          : updated.status === AppointmentStatus.COMPLETED
            ? "check-in realizado"
            : "pendiente";

    await createReceptionNotifications({
      type: "appointment_status",
      title: "Estado de turno actualizado",
      body: `Turno de ${patientName} con ${professionalName} fue ${statusLabel}.`,
      entityType: "appointment",
      entityId: updated.id,
    });
  }

  if (previousStatus !== AppointmentStatus.CANCELLED && updated.status === AppointmentStatus.CANCELLED) {
    await sendAppointmentEmail("cancellation", updated);
  }

  return NextResponse.json(updated);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  const prisma = getPrismaClient();
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      timeSlot: true,
      patient: { include: { user: true } },
      professional: { include: { user: true } },
      service: true,
    },
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

    if (!canCancelWithLimit(appointment.timeSlot.startAt)) {
      return errorResponse("Solo puedes cancelar con 24h de anticipación.", 409);
    }
  }

  if (sessionResult.user.role === "PROFESIONAL") {
    const professional = await prisma.professionalProfile.findUnique({ where: { userId: sessionResult.user.id } });
    if (!professional || appointment.professionalId !== professional.id) {
      return errorResponse("No autorizado.", 403);
    }
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status: AppointmentStatus.CANCELLED,
      timeSlot: {
        update: { status: TimeSlotStatus.AVAILABLE },
      },
    },
    include: {
      patient: { include: { user: true } },
      professional: { include: { user: true, specialty: true } },
      timeSlot: true,
      service: true,
    },
  });

  await createReceptionNotifications({
    type: "appointment_status",
    title: "Turno cancelado",
    body: `Se canceló el turno ${updated.id}.`,
    entityType: "appointment",
    entityId: updated.id,
  });

  await sendAppointmentEmail("cancellation", updated);

  return NextResponse.json(updated);
}
