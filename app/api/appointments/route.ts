import { NextResponse } from "next/server";
import { AppointmentStatus } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";
import type { AppointmentRequestPayload, AppointmentSummary } from "@/lib/api/types";

function toAppointmentSummary(record: {
  id: string;
  patientId: string | null;
  specialistId: string | null;
  scheduleId: string | null;
  service: string;
  scheduledAt: Date;
  status: AppointmentStatus;
  preferredDate: Date | null;
}): AppointmentSummary {
  return {
    id: record.id,
    patientId: record.patientId ?? "unassigned",
    specialistId: record.specialistId ?? "unassigned",
    scheduleId: record.scheduleId ?? undefined,
    preferredDate: record.preferredDate?.toISOString(),
    service: record.service,
    scheduledAt: record.scheduledAt.toISOString(),
    status: record.status,
  };
}

function buildError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const prisma = getPrismaClient();

  try {
    const appointments = await prisma.appointment.findMany({
      orderBy: { scheduledAt: "asc" },
    });

    return NextResponse.json(appointments.map(toAppointmentSummary));
  } catch (error) {
    console.error("Failed to fetch appointments", error);
    return buildError("No se pudieron cargar las citas.", 500);
  }
}

export async function POST(request: Request) {
  let payload: AppointmentRequestPayload;

  try {
    payload = (await request.json()) as AppointmentRequestPayload;
  } catch (error) {
    console.error("Invalid appointment payload", error);
    return buildError("No se pudo leer la solicitud.");
  }

  if (!payload?.name?.trim() || !payload?.phone?.trim() || !payload?.service?.trim()) {
    return buildError("Nombre, teléfono y servicio son obligatorios.");
  }

  const prisma = getPrismaClient();

  try {
    const schedule = payload.scheduleId
      ? await prisma.schedule.findUnique({
          where: { id: payload.scheduleId },
        })
      : null;

    if (payload.scheduleId && !schedule) {
      return buildError("El horario seleccionado no existe.");
    }

    if (schedule?.available === false) {
      return buildError("El horario seleccionado no está disponible.", 409);
    }

    if (payload.scheduleId) {
      const existingBooking = await prisma.appointment.findFirst({
        where: {
          scheduleId: payload.scheduleId,
          status: { in: [AppointmentStatus.pending, AppointmentStatus.confirmed] },
        },
      });

      if (existingBooking) {
        return buildError("El horario ya fue reservado.", 409);
      }
    }

    const preferredDate = payload.preferredDate ? new Date(payload.preferredDate) : null;
    if (preferredDate && Number.isNaN(preferredDate.getTime())) {
      return buildError("La fecha preferida no es válida.");
    }

    const scheduledAt = schedule?.start ?? preferredDate ?? new Date();

    const appointment = await prisma.appointment.create({
      data: payload.patientId
        ? {
            patientId: payload.patientId,
            specialistId: payload.specialistId ?? schedule?.specialistId ?? null,
            scheduleId: payload.scheduleId ?? null,
            service: payload.service,
            scheduledAt,
            preferredDate,
            status: AppointmentStatus.pending,
            notes: payload.message ?? null,
          }
        : {
            specialistId: payload.specialistId ?? schedule?.specialistId ?? null,
            scheduleId: payload.scheduleId ?? null,
            service: payload.service,
            scheduledAt,
            preferredDate,
            status: AppointmentStatus.pending,
            notes: payload.message ?? null,
            patient: {
              create: {
                name: payload.name.trim(),
                phone: payload.phone.trim(),
                email: payload.email?.toLowerCase() ?? null,
              },
            },
          },
    });

    return NextResponse.json(toAppointmentSummary(appointment), { status: 201 });
  } catch (error) {
    console.error("Failed to create appointment", error);
    return buildError("No se pudo crear la cita.", 500);
  }
}
