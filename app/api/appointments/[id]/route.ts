import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { createReceptionNotifications } from "@/lib/notifications";
import { AppointmentStatus, TimeSlotStatus } from "@prisma/client";

const statusValues = Object.values(AppointmentStatus);

function canCancelWithLimit(startAt: Date): boolean {
  const diff = startAt.getTime() - Date.now();
  return diff >= 24 * 60 * 60 * 1000;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const { id } = await params;
  const payload = (await request.json().catch(() => null)) as {
    status?: AppointmentStatus;
    notes?: string | null;
  } | null;

  if (!payload?.status || !statusValues.includes(payload.status)) {
    return errorResponse("Estado inválido.");
  }

  const prisma = getPrismaClient();
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { timeSlot: true, professional: true, patient: true },
  });

  if (!appointment) {
    return errorResponse("Cita no encontrada.", 404);
  }

  if (sessionUser.role === "PACIENTE") {
    const patient = await prisma.patientProfile.findUnique({ where: { userId: sessionUser.id } });
    if (!patient || appointment.patientId !== patient.id) {
      return errorResponse("No autorizado.", 403);
    }

    if (payload.status !== AppointmentStatus.CANCELLED) {
      return errorResponse("Solo puedes cancelar tus citas.", 403);
    }

    if (!canCancelWithLimit(appointment.timeSlot.startAt)) {
      return errorResponse("Solo puedes cancelar con 24h de anticipación.", 409);
    }
  }

  if (sessionUser.role === "PROFESIONAL") {
    const professional = await prisma.professionalProfile.findUnique({ where: { userId: sessionUser.id } });
    if (!professional || appointment.professionalId !== professional.id) {
      return errorResponse("No autorizado.", 403);
    }

    const allowedStatuses = new Set<AppointmentStatus>([AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED]);
    if (!allowedStatuses.has(payload.status)) {
      return errorResponse("No autorizado para este estado.", 403);
    }
  }

  if (isAuthorized(sessionUser.role, ["RECEPCIONISTA", "ADMINISTRADOR"])) {
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

  return NextResponse.json(updated);
}
