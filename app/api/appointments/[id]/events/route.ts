import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { getRequestId } from "@/app/api/_utils/request";
import { requireSession } from "@/lib/authz";
import { logger } from "@/lib/logger";
import { startApiMetric } from "@/lib/observability/metrics";
import { startApiTrace } from "@/lib/observability/tracing";
import { getPrismaClient } from "@/lib/prisma";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const metric = startApiMetric("appointment_event_fetch");
  const requestId = getRequestId(request);
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    metric.end({ status: "error", extra: { code: sessionResult.error.status, requestId } });
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const trace = startApiTrace({
    requestId,
    endpoint: "/api/appointments/[id]/events",
    method: "GET",
    userId: sessionResult.user.id,
    role: sessionResult.user.role,
  });

  try {
    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) {
      metric.end({ status: "error", extra: { code: 400, requestId } });
      trace.end({ status: "error", result: "validation_error", extra: { code: 400 } });
      return errorResponse("ID de cita inválido.", 400);
    }

    const { id } = parsedParams.data;
    const prisma = getPrismaClient();
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      select: {
        patient: { select: { userId: true } },
        professional: { select: { userId: true } },
      },
    });

    if (!appointment) {
      metric.end({ status: "error", extra: { code: 404, requestId } });
      trace.end({ status: "error", result: "not_found", extra: { code: 404 } });
      return errorResponse("Cita no encontrada.", 404);
    }

    const canRead = ["ADMINISTRADOR", "RECEPCIONISTA"].includes(sessionResult.user.role)
      || appointment.patient?.userId === sessionResult.user.id
      || appointment.professional?.userId === sessionResult.user.id;

    if (!canRead) {
      metric.end({ status: "error", extra: { code: 403, requestId } });
      trace.end({ status: "error", result: "forbidden", extra: { code: 403, appointmentId: id } });
      return errorResponse("No autorizado.", 403);
    }

    const events = await prisma.appointmentEvent.findMany({
      where: { appointmentId: id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        appointmentId: true,
        actorRole: true,
        action: true,
        previousStatus: true,
        newStatus: true,
        metadata: true,
        createdAt: true,
        actorUser: { select: { id: true, name: true, lastName: true, email: true } },
      },
    });

    logger.info({
      event: "appointment_events_read",
      action: "appointment_events_read",
      actor: sessionResult.user.role,
      userId: sessionResult.user.id,
      requestId,
      appointmentId: id,
      timestamp: new Date().toISOString(),
      count: events.length,
      result: "ok",
    });

    metric.end({ status: "ok", itemCount: events.length, extra: { actor: sessionResult.user.role, requestId } });
    trace.end({ status: "ok", result: "ok", itemCount: events.length, extra: { appointmentId: id } });

    return NextResponse.json({ events });
  } catch (error) {
    metric.end({ status: "error", extra: { code: 500, requestId }, error });
    trace.end({ status: "error", result: "internal_error", error, extra: { code: 500 } });
    return errorResponse("No se pudieron cargar los eventos de la cita.", 500);
  }
}
