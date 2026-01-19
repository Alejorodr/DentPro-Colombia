import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, serviceUnavailableResponse } from "@/app/api/_utils/response";
import { getPrismaClient, isDatabaseUnavailableError } from "@/lib/prisma";
import { createReceptionNotifications } from "@/lib/notifications";
import { AppointmentStatus, TimeSlotStatus } from "@prisma/client";
import { parseJson } from "@/app/api/_utils/validation";
import { enforceRateLimit } from "@/app/api/_utils/ratelimit";
import { getRequestId } from "@/app/api/_utils/request";
import { logger } from "@/lib/logger";
import { requireRole, requireSession } from "@/lib/authz";
import * as Sentry from "@sentry/nextjs";

const patientDetailsSchema = z.object({
  name: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  email: z.string().trim().email().max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  documentId: z.string().trim().max(40).optional(),
});

const createClientAppointmentSchema = z.object({
  serviceId: z.string().uuid(),
  slotId: z.string().uuid(),
  patientDetails: patientDetailsSchema.optional(),
});

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const startedAt = Date.now();
  const sessionResult = await requireSession();

  if ("error" in sessionResult) {
    logger.warn({
      event: "client.appointment.unauthorized",
      route: "/api/client/appointments",
      requestId,
      status: sessionResult.error.status,
    });
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["PACIENTE"]);
  if (roleError) {
    return errorResponse("No autorizado.", roleError.status);
  }

  const rateLimited = await enforceRateLimit(request, "client:appointments:create", {
    limit: 30,
    window: "1 m",
    windowMs: 60 * 1000,
  });
  if (rateLimited) {
    logger.warn({
      event: "client.appointment.rate_limited",
      route: "/api/client/appointments",
      requestId,
      userId: sessionResult.user.id,
      status: 429,
    });
    return rateLimited;
  }

  logger.info({
    event: "client.appointment.start",
    route: "/api/client/appointments",
    requestId,
    userId: sessionResult.user.id,
  });

  const { data: payload, error } = await parseJson(request, createClientAppointmentSchema);
  if (error) {
    return error;
  }

  if (!payload?.serviceId || !payload?.slotId) {
    return errorResponse("Servicio y slot son obligatorios.");
  }

  try {
    const prisma = getPrismaClient();
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: sessionResult.user.id },
      include: { user: true },
    });

    if (!patient) {
      return errorResponse("Perfil de paciente no encontrado.", 404);
    }

    const service = await prisma.service.findUnique({
      where: { id: payload.serviceId },
    });

    if (!service || !service.active) {
      return errorResponse("Servicio no disponible.", 404);
    }

    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id: payload.slotId },
    });

    if (!timeSlot) {
      return errorResponse("Slot no encontrado.", 404);
    }

    if (timeSlot.status !== TimeSlotStatus.AVAILABLE) {
      return errorResponse("El slot no está disponible.", 409);
    }

    const appointment = await prisma.$transaction(async (tx) => {
      const updatedSlot = await tx.timeSlot.updateMany({
        where: { id: timeSlot.id, status: TimeSlotStatus.AVAILABLE },
        data: { status: TimeSlotStatus.BOOKED },
      });

      if (updatedSlot.count === 0) {
        throw new Error("Slot reservado");
      }

      const details = payload.patientDetails;

      if (details) {
        await tx.user.update({
          where: { id: patient.userId },
          data: {
            name: details.name?.trim() || undefined,
            lastName: details.lastName?.trim() || undefined,
            email: details.email?.toLowerCase() || undefined,
            patient: {
              update: {
                phone: details.phone?.trim() || undefined,
                documentId: details.documentId?.trim() || undefined,
              },
            },
          },
        });
      }

      return tx.appointment.create({
        data: {
          patientId: patient.id,
          professionalId: timeSlot.professionalId,
          timeSlotId: timeSlot.id,
          serviceId: service.id,
          serviceName: service.name,
          servicePriceCents: service.priceCents,
          reason: service.name,
          status: AppointmentStatus.CONFIRMED,
        },
        include: {
          timeSlot: true,
          professional: { include: { user: true, specialty: true } },
          service: true,
        },
      });
    });

    await createReceptionNotifications({
      type: "appointment_created",
      title: "Nuevo turno solicitado",
      body: `Paciente ${patient.user.name} ${patient.user.lastName} agendó una cita.`,
      entityType: "appointment",
      entityId: appointment.id,
    });

    logger.info({
      event: "client.appointment.success",
      route: "/api/client/appointments",
      requestId,
      userId: sessionResult.user.id,
      appointmentId: appointment.id,
      status: 201,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return serviceUnavailableResponse("Base de datos temporalmente no disponible.", error.retryAfterMs);
    }
    Sentry.captureException(error);
    logger.error({
      event: "client.appointment.failed",
      route: "/api/client/appointments",
      requestId,
      userId: sessionResult.user.id,
      status: 409,
      durationMs: Date.now() - startedAt,
      error,
    });
    return errorResponse("No se pudo crear la cita.", 409);
  }
}
