import { NextResponse } from "next/server";
import { AppointmentStatus } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";
import type { AppointmentRequestPayload, AppointmentSummary } from "@/lib/api/types";

function toAppointmentSummary(record: {
  id: string;
  patientId: string | null;
  specialistId: string | null;
  service: string;
  scheduledAt: Date;
  status: AppointmentStatus;
}): AppointmentSummary {
  return {
    id: record.id,
    patientId: record.patientId ?? "unassigned",
    specialistId: record.specialistId ?? "unassigned",
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

  const scheduledAt = payload.preferredDate ? new Date(payload.preferredDate) : new Date();
  if (Number.isNaN(scheduledAt.getTime())) {
    return buildError("La fecha preferida no es válida.");
  }

  const prisma = getPrismaClient();

  try {
    const appointment = await prisma.appointment.create({
      data: payload.patientId
        ? {
            patientId: payload.patientId,
            specialistId: payload.specialistId ?? null,
            service: payload.service,
            scheduledAt,
            status: AppointmentStatus.pending,
            notes: payload.message ?? null,
          }
        : {
            specialistId: payload.specialistId ?? null,
            service: payload.service,
            scheduledAt,
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
