import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { AppointmentStatus } from "@prisma/client";

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

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: payload.status, notes: payload.notes ?? undefined },
    include: {
      patient: { include: { user: true } },
      professional: { include: { user: true, specialty: true } },
      timeSlot: true,
      service: true,
    },
  });

  return NextResponse.json(updated);
}
