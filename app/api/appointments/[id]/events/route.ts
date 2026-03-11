import { NextResponse } from "next/server";

import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";
import { startApiMetric } from "@/lib/observability/metrics";
import { requireSession } from "@/lib/authz";
import { logger } from "@/lib/logger";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const metric = startApiMetric("appointment_event_fetch");
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    metric.end({ status: "error", extra: { code: sessionResult.error.status } });
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const { id } = await params;
  const prisma = getPrismaClient();
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: { patient: { select: { userId: true } }, professional: { select: { userId: true } } },
  });

  if (!appointment) {
    metric.end({ status: "error", extra: { code: 404 } });
    return errorResponse("Cita no encontrada.", 404);
  }

  const canRead = ["ADMINISTRADOR", "RECEPCIONISTA"].includes(sessionResult.user.role)
    || appointment.patient?.userId === sessionResult.user.id
    || appointment.professional?.userId === sessionResult.user.id;

  if (!canRead) {
    metric.end({ status: "error", extra: { code: 403 } });
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

  metric.end({ status: "ok", itemCount: events.length, extra: { actor: sessionResult.user.role } });

  return NextResponse.json({ events });
}
