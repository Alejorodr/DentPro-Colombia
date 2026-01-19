import { NextResponse } from "next/server";
import { z } from "zod";

import { getPrismaClient } from "@/lib/prisma";
import { errorResponse } from "@/app/api/_utils/response";
import { buildPaginatedResponse, getPaginationParams } from "@/app/api/_utils/pagination";
import { createReceptionNotifications } from "@/lib/notifications";
import { AppointmentStatus, TimeSlotStatus } from "@prisma/client";
import { parseJson } from "@/app/api/_utils/validation";
import { enforceRateLimit } from "@/app/api/_utils/ratelimit";
import { logger } from "@/lib/logger";
import { getRequestId } from "@/app/api/_utils/request";
import { requireRole, requireSession } from "@/lib/authz";
import { getAppointmentBufferMinutes, hasBufferConflict } from "@/lib/appointments/scheduling";
import { sendAppointmentEmail } from "@/lib/appointments/email";
import * as Sentry from "@sentry/nextjs";

const createAppointmentSchema = z.object({
  patientId: z.string().uuid().optional(),
  professionalId: z.string().uuid().optional(),
  timeSlotId: z.string().uuid(),
  serviceId: z.string().uuid(),
  reason: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(1000).optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
});

function parseDateRange(searchParams: URLSearchParams) {
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) {
    return null;
  }

  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T23:59:59`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return null;
  }

  return { start, end };
}

export async function GET(request: Request) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, [
    "ADMINISTRADOR",
    "RECEPCIONISTA",
    "PROFESIONAL",
    "PACIENTE",
  ]);
  if (roleError) {
    return errorResponse("No autorizado.", roleError.status);
  }

  const prisma = getPrismaClient();
  const { searchParams } = new URL(request.url);
  const { page, pageSize, skip, take } = getPaginationParams(searchParams);
  const dateRange = parseDateRange(searchParams);
  const dateFilter = dateRange
    ? {
        timeSlot: {
          startAt: { gte: dateRange.start, lte: dateRange.end },
        },
      }
    : {};

  if (["ADMINISTRADOR", "RECEPCIONISTA"].includes(sessionResult.user.role)) {
    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where: dateFilter,
        include: {
          patient: { include: { user: true } },
          professional: { include: { user: true, specialty: true } },
          timeSlot: true,
          service: true,
        },
        orderBy: { timeSlot: { startAt: "asc" } },
        skip,
        take,
      }),
      prisma.appointment.count({ where: dateFilter }),
    ]);
    return NextResponse.json(buildPaginatedResponse(appointments, page, pageSize, total));
  }

  if (sessionResult.user.role === "PROFESIONAL") {
    const professional = await prisma.professionalProfile.findUnique({
      where: { userId: sessionResult.user.id },
    });

    if (!professional) {
      return NextResponse.json(buildPaginatedResponse([], page, pageSize, 0));
    }

    const where = { professionalId: professional.id, ...dateFilter };
    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          patient: { include: { user: true } },
          professional: { include: { user: true, specialty: true } },
          timeSlot: true,
          service: true,
        },
        orderBy: { timeSlot: { startAt: "asc" } },
        skip,
        take,
      }),
      prisma.appointment.count({ where }),
    ]);

    return NextResponse.json(buildPaginatedResponse(appointments, page, pageSize, total));
  }

  const patient = await prisma.patientProfile.findUnique({
    where: { userId: sessionResult.user.id },
  });

  if (!patient) {
    return NextResponse.json(buildPaginatedResponse([], page, pageSize, 0));
  }

  const where = { patientId: patient.id, ...dateFilter };
  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        patient: { include: { user: true } },
        professional: { include: { user: true, specialty: true } },
        timeSlot: true,
        service: true,
      },
      orderBy: { timeSlot: { startAt: "asc" } },
      skip,
      take,
    }),
    prisma.appointment.count({ where }),
  ]);

  return NextResponse.json(buildPaginatedResponse(appointments, page, pageSize, total));
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const startedAt = Date.now();
  const sessionResult = await requireSession();

  if ("error" in sessionResult) {
    logger.warn({
      event: "appointment.create.unauthorized",
      route: "/api/appointments",
      requestId,
      status: sessionResult.error.status,
    });
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR", "RECEPCIONISTA", "PACIENTE"]);
  if (roleError) {
    return errorResponse("No autorizado.", roleError.status);
  }

  const rateLimited = await enforceRateLimit(request, "appointments:create", {
    limit: 30,
    window: "1 m",
    windowMs: 60 * 1000,
  });
  if (rateLimited) {
    logger.warn({
      event: "appointment.create.rate_limited",
      route: "/api/appointments",
      requestId,
      userId: sessionResult.user.id,
      status: 429,
    });
    return rateLimited;
  }

  logger.info({
    event: "appointment.create.start",
    route: "/api/appointments",
    requestId,
    userId: sessionResult.user.id,
  });

  const { data: payload, error } = await parseJson(request, createAppointmentSchema);
  if (error) {
    logger.warn({
      event: "appointment.create.invalid_payload",
      route: "/api/appointments",
      requestId,
      userId: sessionResult.user.id,
      status: 400,
      durationMs: Date.now() - startedAt,
    });
    return error;
  }

  const reason = payload.reason.trim();

  if (!payload?.timeSlotId || !payload.serviceId || !reason) {
    return errorResponse("El slot, el servicio y el motivo son obligatorios.");
  }

  const prisma = getPrismaClient();
  const allowedStatuses = new Set<AppointmentStatus>([
    AppointmentStatus.PENDING,
    AppointmentStatus.CONFIRMED,
  ]);
  const canOverrideStatus = ["ADMINISTRADOR", "RECEPCIONISTA"].includes(sessionResult.user.role);
  const timeSlot = await prisma.timeSlot.findUnique({
    where: { id: payload.timeSlotId },
  });

  if (!timeSlot) {
    return errorResponse("Slot no encontrado.", 404);
  }

  const service = await prisma.service.findUnique({
    where: { id: payload.serviceId },
  });

  if (!service || !service.active) {
    return errorResponse("Servicio no disponible.", 404);
  }

  if (timeSlot.status !== TimeSlotStatus.AVAILABLE) {
    return errorResponse("El slot no está disponible.", 409);
  }

  let patientId: string | null = null;

  if (sessionResult.user.role === "PACIENTE") {
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: sessionResult.user.id },
    });

    if (!patient) {
      return errorResponse("Perfil de paciente no encontrado.", 404);
    }

    patientId = patient.id;
  } else if (["ADMINISTRADOR", "RECEPCIONISTA"].includes(sessionResult.user.role)) {
    patientId = payload.patientId ?? null;
  }

  if (!patientId) {
    return errorResponse("Paciente obligatorio.");
  }

  const professionalId = payload.professionalId ?? timeSlot.professionalId;

  if (professionalId !== timeSlot.professionalId) {
    return errorResponse("El profesional no coincide con el slot.");
  }

  const bufferMinutes = getAppointmentBufferMinutes();
  if (bufferMinutes > 0) {
    const bufferMs = bufferMinutes * 60_000;
    const bufferStart = new Date(timeSlot.startAt.getTime() - bufferMs);
    const bufferEnd = new Date(timeSlot.endAt.getTime() + bufferMs);
    const bookedSlots = await prisma.timeSlot.findMany({
      where: {
        professionalId,
        status: TimeSlotStatus.BOOKED,
        id: { not: timeSlot.id },
        startAt: { lt: bufferEnd },
        endAt: { gt: bufferStart },
      },
      select: { startAt: true, endAt: true },
    });

    const conflict = hasBufferConflict(
      { startAt: timeSlot.startAt, endAt: timeSlot.endAt },
      bookedSlots,
      bufferMinutes,
    );
    if (conflict) {
      return errorResponse("El horario seleccionado no respeta el buffer entre turnos.", 409);
    }
  }

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      const updated = await tx.timeSlot.updateMany({
        where: { id: timeSlot.id, status: TimeSlotStatus.AVAILABLE },
        data: { status: TimeSlotStatus.BOOKED },
      });

      if (updated.count === 0) {
        throw new Error("Slot reservado");
      }

      const created = await tx.appointment.create({
        data: {
          patientId,
          professionalId,
          timeSlotId: timeSlot.id,
          serviceId: service.id,
          serviceName: service.name,
          servicePriceCents: service.priceCents,
          reason,
          notes: payload.notes?.trim() || null,
          status:
            canOverrideStatus && payload?.status && allowedStatuses.has(payload.status)
              ? payload.status
              : AppointmentStatus.PENDING,
        },
        include: {
          patient: { include: { user: true } },
          professional: { include: { user: true, specialty: true } },
          timeSlot: true,
          service: true,
        },
      });

      return created;
    });

    if (sessionResult.user.role === "PACIENTE") {
      await createReceptionNotifications({
        type: "appointment_created",
        title: "Nuevo turno solicitado",
        body: `Paciente ${appointment.patient?.user.name ?? ""} ${appointment.patient?.user.lastName ?? ""} agendó una cita.`,
        entityType: "appointment",
        entityId: appointment.id,
      });
    }

    await sendAppointmentEmail("confirmation", appointment);

    logger.info({
      event: "appointment.created",
      route: "/api/appointments",
      appointmentId: appointment.id,
      userId: sessionResult.user.id,
      role: sessionResult.user.role,
      timeSlotId: appointment.timeSlotId,
      serviceId: appointment.serviceId,
      requestId,
      status: 201,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    Sentry.captureException(error);
    logger.error(
      {
        event: "appointment.create_failed",
        route: "/api/appointments",
        error,
        requestId,
        userId: sessionResult.user.id,
        status: 409,
        durationMs: Date.now() - startedAt,
      },
      "No se pudo crear la cita",
    );
    return errorResponse("No se pudo crear la cita.", 409);
  }
}
