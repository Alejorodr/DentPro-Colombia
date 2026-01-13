import { NextResponse } from "next/server";

import { getSessionUser } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";
import { AppointmentStatus, TimeSlotStatus } from "@prisma/client";

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (sessionUser.role !== "PACIENTE") {
    return errorResponse("No autorizado.", 403);
  }

  const payload = (await request.json().catch(() => null)) as {
    serviceId?: string;
    slotId?: string;
    patientDetails?: {
      name?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      documentId?: string;
    };
  } | null;

  if (!payload?.serviceId || !payload?.slotId) {
    return errorResponse("Servicio y slot son obligatorios.");
  }

  const prisma = getPrismaClient();
  const patient = await prisma.patientProfile.findUnique({
    where: { userId: sessionUser.id },
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

  try {
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

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error("No se pudo crear la cita del paciente", error);
    return errorResponse("No se pudo crear la cita.", 409);
  }
}
