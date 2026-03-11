import { NextResponse } from "next/server";

import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";
import { logger } from "@/lib/logger";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const { id } = await params;
  const prisma = getPrismaClient();
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: { patient: { select: { userId: true } }, professional: { select: { userId: true } } },
  });

  if (!appointment) {
    return errorResponse("Cita no encontrada.", 404);
  }

  const canRead = ["ADMINISTRADOR", "RECEPCIONISTA"].includes(sessionResult.user.role)
    || appointment.patient?.userId === sessionResult.user.id
    || appointment.professional?.userId === sessionResult.user.id;

  if (!canRead) {
    return errorResponse("No autorizado.", 403);
  }

  const events = await prisma.appointmentEvent.findMany({
    where: { appointmentId: id },
    orderBy: { createdAt: "desc" },
    include: { actorUser: { select: { id: true, name: true, lastName: true, email: true } } },
  });

  logger.info({
    event: "appointment_events_read",
    action: "appointment_events_read",
    actor: sessionResult.user.role,
    appointmentId: id,
    timestamp: new Date().toISOString(),
    count: events.length,
    result: "ok",
  });

  return NextResponse.json({ events });
}
