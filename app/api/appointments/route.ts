import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { AppointmentStatus, TimeSlotStatus } from "@prisma/client";

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const prisma = getPrismaClient();

  if (isAuthorized(sessionUser.role, ["ADMINISTRADOR", "RECEPCIONISTA"])) {
    const appointments = await prisma.appointment.findMany({
      include: {
        patient: { include: { user: true } },
        professional: { include: { user: true, specialty: true } },
        timeSlot: true,
      },
      orderBy: { timeSlot: { startAt: "asc" } },
    });
    return NextResponse.json(appointments);
  }

  if (sessionUser.role === "PROFESIONAL") {
    const professional = await prisma.professionalProfile.findUnique({
      where: { userId: sessionUser.id },
    });

    if (!professional) {
      return NextResponse.json([]);
    }

    const appointments = await prisma.appointment.findMany({
      where: { professionalId: professional.id },
      include: {
        patient: { include: { user: true } },
        professional: { include: { user: true, specialty: true } },
        timeSlot: true,
      },
      orderBy: { timeSlot: { startAt: "asc" } },
    });

    return NextResponse.json(appointments);
  }

  const patient = await prisma.patientProfile.findUnique({
    where: { userId: sessionUser.id },
  });

  if (!patient) {
    return NextResponse.json([]);
  }

  const appointments = await prisma.appointment.findMany({
    where: { patientId: patient.id },
    include: {
      patient: { include: { user: true } },
      professional: { include: { user: true, specialty: true } },
      timeSlot: true,
    },
    orderBy: { timeSlot: { startAt: "asc" } },
  });

  return NextResponse.json(appointments);
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const payload = (await request.json().catch(() => null)) as {
    patientId?: string;
    professionalId?: string;
    timeSlotId?: string;
    reason?: string;
    notes?: string;
  } | null;

  const reason = payload?.reason?.trim();

  if (!payload?.timeSlotId || !reason) {
    return errorResponse("El slot y el motivo son obligatorios.");
  }

  const prisma = getPrismaClient();
  const timeSlot = await prisma.timeSlot.findUnique({
    where: { id: payload.timeSlotId },
  });

  if (!timeSlot) {
    return errorResponse("Slot no encontrado.", 404);
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
          reason,
          notes: payload.notes?.trim() || null,
          status: AppointmentStatus.PENDING,
        },
        include: {
          patient: { include: { user: true } },
          professional: { include: { user: true, specialty: true } },
          timeSlot: true,
        },
      });

      return created;
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error("No se pudo crear la cita", error);
    return errorResponse("No se pudo crear la cita.", 409);
  }
}
