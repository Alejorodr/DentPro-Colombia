import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import type { AppointmentRequestPayload, AppointmentStatus } from "@/lib/api/types";
import { buildError, toAppointmentSummary } from "./utils";

const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = ["pending", "confirmed"];
const DEFAULT_APPOINTMENT_STATUS: AppointmentStatus = "pending";

export async function GET() {
  const prisma = getPrismaClient();

  try {
    const appointments = await prisma.appointment.findMany({
      orderBy: { scheduledAt: "asc" },
      include: {
        patient: true,
        specialist: true,
        schedule: {
          include: {
            specialist: true,
          },
        },
      },
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
          status: { in: ACTIVE_APPOINTMENT_STATUSES },
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
            status: DEFAULT_APPOINTMENT_STATUS,
            notes: payload.message ?? null,
          }
        : {
            specialistId: payload.specialistId ?? schedule?.specialistId ?? null,
            scheduleId: payload.scheduleId ?? null,
            service: payload.service,
            scheduledAt,
            preferredDate,
            status: DEFAULT_APPOINTMENT_STATUS,
            notes: payload.message ?? null,
            patient: {
              create: {
                name: payload.name.trim(),
                phone: payload.phone.trim(),
                email: payload.email?.toLowerCase() ?? null,
              },
            },
          },
      include: {
        patient: true,
        specialist: true,
        schedule: {
          include: {
            specialist: true,
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
