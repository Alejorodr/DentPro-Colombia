import { NextResponse } from "next/server";
import { z } from "zod";

import { getPrismaClient } from "@/lib/prisma";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { buildPaginatedResponse, getPaginationParams } from "@/app/api/_utils/pagination";
import { createReceptionNotifications } from "@/lib/notifications";
import { AppointmentStatus, TimeSlotStatus } from "@prisma/client";
import { parseJson } from "@/app/api/_utils/validation";
import { enforceRateLimit } from "@/app/api/_utils/ratelimit";

const createAppointmentSchema = z.object({
  patientId: z.string().uuid().optional(),
  professionalId: z.string().uuid().optional(),
  timeSlotId: z.string().uuid(),
  serviceId: z.string().uuid(),
  reason: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(1000).optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
});

export async function GET(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const prisma = getPrismaClient();
  const { searchParams } = new URL(request.url);
  const { page, pageSize, skip, take } = getPaginationParams(searchParams);

  if (isAuthorized(sessionUser.role, ["ADMINISTRADOR", "RECEPCIONISTA"])) {
    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
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
      prisma.appointment.count(),
    ]);
    return NextResponse.json(buildPaginatedResponse(appointments, page, pageSize, total));
  }

  if (sessionUser.role === "PROFESIONAL") {
    const professional = await prisma.professionalProfile.findUnique({
      where: { userId: sessionUser.id },
    });

    if (!professional) {
      return NextResponse.json(buildPaginatedResponse([], page, pageSize, 0));
    }

    const where = { professionalId: professional.id };
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
    where: { userId: sessionUser.id },
  });

  if (!patient) {
    return NextResponse.json(buildPaginatedResponse([], page, pageSize, 0));
  }

  const where = { patientId: patient.id };
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
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const rateLimited = await enforceRateLimit(request, "appointments:create", {
    limit: 10,
    window: "1 m",
    windowMs: 60 * 1000,
  });
  if (rateLimited) {
    return rateLimited;
  }

  const { data: payload, error } = await parseJson(request, createAppointmentSchema);
  if (error) {
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

  if (sessionUser.role === "PACIENTE") {
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: sessionUser.id },
    });

    if (!patient) {
      return errorResponse("Perfil de paciente no encontrado.", 404);
    }

    patientId = patient.id;
  } else if (isAuthorized(sessionUser.role, ["ADMINISTRADOR", "RECEPCIONISTA"])) {
    patientId = payload.patientId ?? null;
  }

  if (!patientId) {
    return errorResponse("Paciente obligatorio.");
  }

  const professionalId = payload.professionalId ?? timeSlot.professionalId;

  if (professionalId !== timeSlot.professionalId) {
    return errorResponse("El profesional no coincide con el slot.");
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
            isAuthorized(sessionUser.role, ["ADMINISTRADOR", "RECEPCIONISTA"]) &&
            payload?.status &&
            allowedStatuses.has(payload.status)
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

    if (sessionUser.role === "PACIENTE") {
      await createReceptionNotifications({
        type: "appointment_created",
        title: "Nuevo turno solicitado",
        body: `Paciente ${appointment.patient?.user.name ?? ""} ${appointment.patient?.user.lastName ?? ""} agendó una cita.`,
        entityType: "appointment",
        entityId: appointment.id,
      });
    }

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error("No se pudo crear la cita", error);
    return errorResponse("No se pudo crear la cita.", 409);
  }
}
