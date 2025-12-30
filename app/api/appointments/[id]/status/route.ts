import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import type { AppointmentStatus } from "@/lib/api/types";
import { buildError, isValidAppointmentStatus, toAppointmentSummary } from "../../utils";

const transitionRules: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["cancelled"],
  cancelled: [],
};

export async function PATCH(request: Request, context: any) {
  const prisma = getPrismaClient();

  const { params } = context as { params?: { id?: string } };
  const appointmentId = params?.id;
  if (!appointmentId) {
    return buildError("Debes especificar una cita válida.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    console.error("Invalid status payload", error);
    return buildError("No se pudo leer la solicitud de cambio de estado.");
  }

  const rawStatus =
    typeof (body as { status?: string }).status === "string"
      ? (body as { status: string }).status
      : "";

  if (!isValidAppointmentStatus(rawStatus)) {
    return buildError("El estado solicitado no es válido.", 400);
  }

  const nextStatus = rawStatus as AppointmentStatus;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    return buildError("La cita no existe.", 404);
  }

  const currentStatus = appointment.status as AppointmentStatus;
  const allowedTransitions = transitionRules[currentStatus];

  if (!allowedTransitions.includes(nextStatus)) {
    return buildError(
      "No es posible cambiar el estado actual a la opción solicitada. Verifica el flujo de confirmación/cancelación.",
      400,
    );
  }

  try {
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: nextStatus },
      include: {
        patient: true,
        specialist: true,
        schedule: { include: { specialist: true } },
      },
    });

    return NextResponse.json(toAppointmentSummary(updated));
  } catch (error) {
    console.error("Failed to update appointment status", error);
    return buildError("No se pudo actualizar el estado de la cita.", 500);
  }
}
